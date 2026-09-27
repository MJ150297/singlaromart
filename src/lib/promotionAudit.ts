import { randomBytes } from "crypto";

export type AuditSeverity = "low" | "medium" | "high" | "critical";
export type AuditStatus = "pending_review" | "cleared" | "blocked" | "resolved";

export interface AuditEventInput {
  entityType: "coupon" | "delivery_rule" | "referral" | "credit" | "refund" | "order";
  entityId: string;
  eventType: string;
  actor: string;
  actorRole?: string;
  summary: string;
  details?: Record<string, unknown>;
  severity?: AuditSeverity;
  status?: AuditStatus;
}

export interface PromotionAuditEvent {
  eventId: string;
  entityType: AuditEventInput["entityType"];
  entityId: string;
  eventType: string;
  actor: string;
  actorRole: string;
  summary: string;
  details: Record<string, unknown>;
  severity: AuditSeverity;
  status: AuditStatus;
  createdAt: Date;
}

export function buildAuditEvent(input: AuditEventInput): PromotionAuditEvent {
  const normalized = {
    eventId: `audit_${Date.now()}_${Buffer.from(randomBytes(3)).toString("hex")}`,
    entityType: input.entityType,
    entityId: input.entityId,
    eventType: input.eventType,
    actor: input.actor,
    actorRole: input.actorRole || "system",
    summary: input.summary,
    details: input.details ?? {},
    severity: input.severity || "medium",
    status: input.status || "pending_review",
    createdAt: new Date(),
  };

  return normalized;
}
