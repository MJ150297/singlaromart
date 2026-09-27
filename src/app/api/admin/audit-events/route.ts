import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireOwner } from "@/lib/auth/guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { PromotionAuditEvent } from "@/lib/models/PromotionAuditEvent";

const AuditEventInputSchema = z.object({
  entityType: z.enum(["coupon", "delivery_rule", "referral", "credit", "refund", "order"]),
  entityId: z.string().trim().min(1),
  eventType: z.string().trim().min(2),
  actor: z.string().trim().min(1),
  actorRole: z.string().trim().default("system"),
  summary: z.string().trim().min(2),
  details: z.record(z.string(), z.any()).default({}),
  severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  status: z.enum(["pending_review", "cleared", "blocked", "resolved"]).default("pending_review"),
});

function newEventId() {
  return `audit_${Date.now()}_${Buffer.from(randomBytes(3)).toString("hex")}`;
}

export async function GET() {
  const { error } = await requireOwner();
  if (error) return error;
  await connectToDatabase();
  const items = await PromotionAuditEvent.find().sort({ createdAt: -1 }).limit(100).lean();
  return NextResponse.json({ success: true, data: items });
}

export async function POST(request: Request) {
  const { error } = await requireOwner();
  if (error) return error;

  try {
    const input = AuditEventInputSchema.parse(await request.json());
    await connectToDatabase();
    const event = await PromotionAuditEvent.create({
      eventId: newEventId(),
      ...input,
      details: input.details ?? {},
    });
    return NextResponse.json({ success: true, data: event }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ success: false, error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: "Unable to log audit event." }, { status: 400 });
  }
}
