import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireOwner } from "@/lib/auth/guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { RewardLedger } from "@/lib/models/RewardLedger";
import { User } from "@/lib/models/User";
import { buildAuditEvent } from "@/lib/promotionAudit";

const Schema = z.object({
  delta: z.number().finite(),
  reason: z.string().trim().min(2).max(200),
  note: z.string().trim().max(500).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireOwner();
  if (error) return error;

  try {
    const { id } = await params;
    const body = Schema.parse(await request.json());
    await connectToDatabase();

    const user = await User.findByIdAndUpdate(
      id,
      { $inc: { creditBalance: body.delta } },
      { returnDocument: "after", lean: true }
    );

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const entry = await RewardLedger.create({
      entryId: `credit_adj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      userId: id,
      delta: body.delta,
      balanceAfter: user.creditBalance,
      reason: "manual_adjustment",
      status: "applied",
      expiresAt: null,
    });

    const event = buildAuditEvent({
      entityType: "credit",
      entityId: id,
      eventType: "credit.adjust",
      actor: session?.user?.email || "owner",
      actorRole: "owner",
      summary: "Manual credit adjustment applied",
      details: { delta: body.delta, reason: body.reason, note: body.note ?? "", entryId: String(entry._id) },
      severity: body.delta >= 0 ? "medium" : "high",
      status: "resolved",
    });

    await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/admin/audit-events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    }).catch(() => undefined);

    return NextResponse.json({ success: true, data: { user, entry } });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ success: false, error: err.issues }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: "Unable to adjust credit." }, { status: 400 });
  }
}
