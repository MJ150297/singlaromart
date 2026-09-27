import { randomBytes } from "crypto";
import { User } from "@/lib/models/User";
import { RewardLedger } from "@/lib/models/RewardLedger";
import { roundMoney } from "./money";

function entryId() { return `credit_${Date.now()}_${Buffer.from(randomBytes(3)).toString("hex")}`; }

export async function applyStoreCredit(userId: string, amount: number, orderId: string) {
  const value = roundMoney(amount);
  if (value <= 0) return null;
  const user = await User.findOneAndUpdate({ _id: userId, creditBalance: { $gte: value } }, { $inc: { creditBalance: -value } }, { returnDocument: "after", lean: true });
  if (!user) throw new Error("Insufficient store credit.");
  return RewardLedger.create({ entryId: entryId(), userId, orderId, delta: -value, balanceAfter: user.creditBalance, reason: "order_payment", status: "applied" });
}

export async function restoreStoreCredit(userId: string, amount: number, orderId: string) {
  const value = roundMoney(amount);
  if (value <= 0) return null;
  const user = await User.findOneAndUpdate({ _id: userId }, { $inc: { creditBalance: value } }, { returnDocument: "after", lean: true });
  if (!user) return null;
  return RewardLedger.create({ entryId: entryId(), userId, orderId, delta: value, balanceAfter: user.creditBalance, reason: "refund_restore", status: "applied" });
}