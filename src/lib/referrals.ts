import { createHmac, randomBytes } from "crypto";
import { ReferralAttribution } from "@/lib/models/ReferralAttribution";
import { ReferralProfile } from "@/lib/models/ReferralProfile";
import { ReferralProgram } from "@/lib/models/ReferralProgram";
import { ReferralReward } from "@/lib/models/ReferralReward";
import { RewardLedger } from "@/lib/models/RewardLedger";
import { User } from "@/lib/models/User";
import { buildAuditEvent } from "@/lib/promotionAudit";

export const REFERRAL_COOKIE = "indiyano_referral";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

function secret() { return process.env.REFERRAL_COOKIE_SECRET || "development-referral-secret-change-me"; }
function sign(value: string) { return createHmac("sha256", secret()).update(value).digest("hex"); }

export function createReferralCookieValue(code: string) {
  const payload = `${code.trim().toUpperCase()}.${Date.now()}`;
  return `${payload}.${sign(payload)}`;
}

export function readReferralCookieValue(value?: string | null): string | null {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [code, timestamp, signature] = parts;
  const age = Date.now() - Number(timestamp);
  if (!code || !signature || !Number.isFinite(age) || age < 0 || age > COOKIE_MAX_AGE * 1000) return null;
  const expected = sign(`${code}.${timestamp}`);
  if (signature.length !== expected.length) return null;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) mismatch |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
  return mismatch === 0 ? code : null;
}

export function referralCookieOptions() {
  return { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", maxAge: COOKIE_MAX_AGE, path: "/" };
}

export function withReferralParam(url: string, refCode: string) {
  const parsed = new URL(url, "http://localhost");
  parsed.searchParams.set("ref", refCode.trim().toUpperCase());
  return `${parsed.pathname}${parsed.search}`;
}

function newCode() { return `IND${Buffer.from(randomBytes(5)).toString("base64url").toUpperCase()}`; }
function newId(prefix: string) { return `${prefix}_${Date.now()}_${Buffer.from(randomBytes(3)).toString("hex")}`; }

export async function getActiveProgram() {
  const now = new Date();
  return ReferralProgram.findOne({ isActive: true, $and: [{ $or: [{ startsAt: { $exists: false } }, { startsAt: null }, { startsAt: { $lte: now } }] }, { $or: [{ endsAt: { $exists: false } }, { endsAt: null }, { endsAt: { $gte: now } }] }] }).sort({ createdAt: -1 }).lean();
}

export async function ensureReferralProfile(userId: string) {
  const existing = await ReferralProfile.findOne({ userId }).lean();
  if (existing) return existing;
  const program = await getActiveProgram();
  if (!program) return null;
  return ReferralProfile.create({ userId, programId: program.id, referralCode: newCode() });
}

export async function bindReferralCode(code: string, referredUserId: string) {
  const profile = await ReferralProfile.findOne({ referralCode: code.toUpperCase() }).lean();
  if (!profile || profile.userId === referredUserId) return null;
  const user = await User.findById(referredUserId).lean();
  if (!user || user.phoneVerified !== true) return null;
  const program = await ReferralProgram.findOne({ id: profile.programId, isActive: true }).lean();
  if (!program) return null;
  try {
    return await ReferralAttribution.create({ referrerProfileId: profile.userId, referrerUserId: profile.userId, referredUserId, programId: program.id, source: "link", expiresAt: new Date(Date.now() + (program.expiresAfterDays ?? 90) * 86400000) });
  } catch (error) {
    if ((error as { code?: number })?.code === 11000) return ReferralAttribution.findOne({ referredUserId, programId: program.id }).lean();
    throw error;
  }
}

export async function qualifyReferralForDeliveredOrder(referredUserId: string, orderId: string) {
  const attribution = await ReferralAttribution.findOneAndUpdate({ referredUserId, fraudStatus: { $nin: ["blocked"] }, qualifiedAt: { $exists: false }, expiresAt: { $gte: new Date() } }, { $set: { qualifiedAt: new Date(), orderId } }, { returnDocument: "after" }).lean();
  if (!attribution) return null;
  const program = await ReferralProgram.findOne({ id: attribution.programId }).lean();
  if (!program) return null;
  const reward = await ReferralReward.findOneAndUpdate({ attributionId: String(attribution._id) }, { $setOnInsert: { attributionId: String(attribution._id), referrerUserId: attribution.referrerUserId, referredUserId, programId: program.id, rewardAmount: program.referrerRewardAmount, expiresAt: new Date(Date.now() + (program.expiresAfterDays ?? 90) * 86400000), status: "awarded", awardedAt: new Date(), orderId } }, { upsert: true, returnDocument: "after" }).lean();
  if (!reward) return null;
  const entryId = newId("credit");
  const user = await User.findOneAndUpdate({ _id: attribution.referrerUserId }, { $inc: { creditBalance: reward.rewardAmount } }, { returnDocument: "after", lean: true });
  if (!user) return null;
  await RewardLedger.create({ entryId, userId: attribution.referrerUserId, referralRewardId: String(reward._id), orderId, delta: reward.rewardAmount, balanceAfter: user.creditBalance, reason: "referral_reward", expiresAt: reward.expiresAt });
  const auditEvent = buildAuditEvent({
    entityType: "referral",
    entityId: String(attribution._id),
    eventType: "referral.reward",
    actor: "system",
    actorRole: "system",
    summary: "Referral reward issued after delivered order",
    details: { orderId, programId: program.id, rewardAmount: reward.rewardAmount, referrerUserId: attribution.referrerUserId },
    severity: "medium",
    status: "resolved",
  });
  await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/admin/audit-events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(auditEvent),
  }).catch(() => undefined);
  return reward;
}

export async function flagReferralAttribution(attributionId: string, reason: string, riskScore = 0) {
  const attribution = await ReferralAttribution.findOneAndUpdate(
    { _id: attributionId },
    { $set: { fraudStatus: "flagged", updatedAt: new Date() } },
    { returnDocument: "after" }
  ).lean();

  if (!attribution) return null;

  const auditEvent = buildAuditEvent({
    entityType: "referral",
    entityId: String(attribution._id),
    eventType: "referral.review",
    actor: "owner",
    actorRole: "owner",
    summary: "Referral attribution flagged for manual review",
    details: { reason, riskScore, referredUserId: attribution.referredUserId, referrerUserId: attribution.referrerUserId },
    severity: riskScore >= 80 ? "high" : "medium",
    status: "pending_review",
  });

  await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/admin/audit-events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(auditEvent),
  }).catch(() => undefined);

  return attribution;
}
