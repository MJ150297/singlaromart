import { describe, expect, it } from "vitest";
import { buildAuditEvent } from "./promotionAudit";

describe("buildAuditEvent", () => {
  it("normalizes review metadata and keeps the audit status explicit", () => {
    const event = buildAuditEvent({
      entityType: "referral",
      entityId: "attr_123",
      eventType: "referral.review",
      actor: "owner@example.com",
      actorRole: "owner",
      summary: "Flagged a referral attribution for fraud review",
      details: { reason: "suspicious order pattern", riskScore: 82 },
      severity: "high",
    });

    expect(event.entityType).toBe("referral");
    expect(event.eventType).toBe("referral.review");
    expect(event.severity).toBe("high");
    expect(event.status).toBe("pending_review");
    expect(event.details.reason).toBe("suspicious order pattern");
    expect(event.eventId).toMatch(/^audit_/);
  });
});
