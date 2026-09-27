# Promotions & Referrals — Frozen Policy

> **Status:** Living policy doc. Phase 0 lock. Any change must be reviewed before
> implementation references it.
> **Codebase:** Next.js 16.2.12 App Router · Mongoose 9 · Zod 4 · next-auth 5 (JWT) · INR only.

## 1. Scope

Coupons, delivery fees, store credits, and referrals layered on the existing
order flow. Orders require login (no guest checkout). Payment is COD /
UPI-on-delivery; there is no payment-gateway event, so **commitments happen at
order creation** and are reversed on cancel/refund.

## 2. Locked rules

1. **One coupon per order** (MVP). `stackingPolicy` is always `"single"`.
2. **Server is the pricing authority.** Client cart prices are display-only.
   Prices are recalculated from Mongo at checkout and snapped into the order.
3. **Tax-inclusive pricing.** Prices shown include all taxes. There is no `tax`
   line in the order snapshot; `pricing.taxInclusive: true`.
4. **Single currency INR.** All amounts are rupees, 2 decimal places, rounded
   through `src/lib/pricing/money.ts` only.
5. **Delivery fees** resolve at checkout from admin-managed `DeliveryFeeRule`s.
   Precedence: `free_delivery` coupon override → product → subcategory → category
   → global; slot-specific beats slot-agnostic; `free_over_threshold` falls
   through when under `minOrderAmount`; no match → ₹0.
6. **Coupon redemption lifecycle:** `reserved` at order creation → `redeemed` on
   delivery → **auto `released`** on cancel/refund (usage count restored).
   Redemptions are records, not just counters.
7. **Refunds:** every refund creates a separate `Refund` record. Issuing a
   refund releases the coupon and restores consumed credits.
8. **Store credits (referral rewards)** live in an append-only `RewardLedger`
   seeded by `User.creditBalance` (cached, reconciliable). Consumed irrevocably
   at order creation (`applied`); a refund restores value via a **new** ledger
   grant — spent entries are never mutated.
9. **Referral config is data, not code:** one or more `ReferralProgram`s hold
   referred-user benefit, referrer reward amount, benefit scope (product /
   category / all), and `expiresAfterDays` (default 90). Issued rewards snapshot
   program values at qualification time and are not changed by later program
   edits.
10. **Verified account = OTP-verified phone** (the only consumer identity the
    site uses). Referral attribution binds to the user created at first OTP login.
11. **Anti-abuse:** no self-referrals, no duplicate identities (relies on unique
    `User.phone` / `User.email`), program caps, signed attribution cookie,
    rate limits, audit events.
12. **No hard deletes** of used coupons, redemption records, ledger entries, or
    audit events. Deactivate, release/reverse, and archive instead.

## 3. Pricing precedence (final)

```
subtotal             = Σ(server unitPrice × qty)          // must be isPublished; stock enforced
couponDiscount       = one coupon (caps, scope, min-order)
referralDiscount     = referred user's first qualifying-order benefit
discountTotal        = couponDiscount + referralDiscount
totalBeforeCredits   = max(0, subtotal + deliveryFee − discountTotal)
storeCreditApplied   = min(available credits, totalBeforeCredits)
grandTotal           = totalBeforeCredits − storeCreditApplied   // amount collected
```

Minimum-order thresholds evaluate on `subtotal` before any discount. Percentage
coupons require a maximum cap. Fixed coupons cannot exceed eligible subtotal.

## 4. Order pricing snapshot

```ts
pricing: {
  subtotal, deliveryFee, discountTotal, couponDiscount, referralDiscount,
  storeCreditApplied, totalBeforeCredits, grandTotal,
  currency: "INR", taxInclusive: true,
}
appliedPromotions: [{ type: "coupon" | "referral_benefit" | "store_credit",
  code?, promotionId?, amount, metadata? }]
couponRedemptionIds: string[]
creditLedgerEntryIds: string[]
idempotencyKey: string   // unique, sparse, retries rejected
```

The snapshot is immutable — later coupon/program edits never change it.

## 5. Order lifecycle side effects

| Transition | Coupon | Credits | Referral |
|---|---|---|---|
| Order created | Redemption `reserved`; usage `$inc` | Ledger `applied` (delta −) | Attribution awaits first order |
| Delivered | Redemption `redeemed` | — | Qualify once → reward ledger grant (+ expiry) |
| Cancelled / refunded | Redemption `released` (auto, full) + `Refund` record | Restore grant (delta +) | Disqualify if this was the qualifying order |

## 6. Error codes (stable, used by the UI)

`COUPON_INVALID`, `COUPON_EXPIRED`, `COUPON_NOT_STARTED`, `COUPON_EXHAUSTED`,
`COUPON_USER_LIMIT`, `COUPON_MIN_ORDER`, `COUPON_SCOPE_EXCLUDED`,
`COUPON_FIRST_ORDER_ONLY`, `PRODUCT_UNAVAILABLE`, `OUT_OF_STOCK`,
`REFERRAL_REWARD_UNAVAILABLE`, `IDEMPOTENCY_DUPLICATE`, `UNAUTHORIZED`.

## 7. Audit taxonomy (AuditEvent)

`coupon.create/edit/deactivate/archive`, `coupon.redeem/release/reverse`,
`delivery_rule.create/edit/archive`, `program.create/edit/archive`,
`referral.review/flag/block`, `credit.adjust/reverse`, `refund.create/process`.

## 8. Key files & conventions

- Pricing engine: `src/lib/pricing/` (money, types, fetchCart, deliveryFees,
  validateCoupon, referralRules, credits, calculateCart, index).
- Lifecycle side effects: `src/lib/orders/orderLifecycle.ts`.
- Admin API: `src/app/api/admin/{coupons,delivery-fees,referral-programs,
  referrals,credits,refunds,promotion-reports,audit-events}` routes under
  `requireOwner()`.
- All dynamic admin routes use the App Router async `params` signature
  (`{ params }: { params: Promise<{ id }> }`).
- Tests: Vitest; unit tests need no DB; integration tests use mongodb-memory-server.

## 9. Rollout

1. Phase 1 lands snapshot-only (no behavior change; delivery fee defaults ₹0).
2. Admin-managed delivery-fee rules go live.
3. Coupons internal-only → one low-risk campaign → metrics review.
4. Referrals after coupon accounting is stable.
5. Enterprise controls (fraud review, reports, alerts) land continuously.