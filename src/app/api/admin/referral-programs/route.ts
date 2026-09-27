import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireOwner } from "@/lib/auth/guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { ReferralProgram } from "@/lib/models/ReferralProgram";

const Schema = z.object({ name: z.string().trim().min(2), slug: z.string().trim().min(2).regex(/^[a-z0-9-]+$/), referredBenefitAmount: z.number().min(0), referrerRewardAmount: z.number().positive(), benefitScope: z.enum(["all", "product", "category"]).default("all"), eligibleProductIds: z.array(z.string()).default([]), eligibleCategoryIds: z.array(z.string()).default([]), expiresAfterDays: z.number().int().positive().default(90), isActive: z.boolean().default(true), startsAt: z.string().datetime().optional().nullable(), endsAt: z.string().datetime().optional().nullable() });
function id() { return `program_${Date.now()}_${Buffer.from(randomBytes(3)).toString("hex")}`; }

export async function GET() { const { error } = await requireOwner(); if (error) return error; await connectToDatabase(); return NextResponse.json({ success: true, data: await ReferralProgram.find().sort({ createdAt: -1 }).lean() }); }
export async function POST(request: Request) { const { error, session } = await requireOwner(); if (error) return error; try { const input = Schema.parse(await request.json()); await connectToDatabase(); const program = await ReferralProgram.create({ ...input, id: id(), startsAt: input.startsAt ? new Date(input.startsAt) : null, endsAt: input.endsAt ? new Date(input.endsAt) : null, createdBy: session?.user?.email || "owner", updatedBy: session?.user?.email || "owner" }); return NextResponse.json({ success: true, data: program }, { status: 201 }); } catch (err) { if (err instanceof ZodError) return NextResponse.json({ success: false, error: err.issues }, { status: 400 }); return NextResponse.json({ success: false, error: "Unable to create referral program." }, { status: 400 }); } }