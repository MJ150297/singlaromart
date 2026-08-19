# Dynamic Offer Carousel System

This document explains how the homepage offer carousels work in the current **database-driven** system — how sections are created, how products get selected, and how scheduling & visibility are controlled.

---

## 1. Overview

The homepage displays **horizontal scrolling carousels** of products, each with a title like:

- 🎊 Diwali Specials
- ☀️ Summer Trends
- 🍬 Festive Sweets
- 🔥 Today's Deals

**Every** carousel section is now an **Offer** stored in the MongoDB `offers` collection and managed from **Admin → Offers**. There is **no hardcoded festival/season/time-of-day logic** anymore — `src/lib/seasonalOffers.ts` has been fully deleted.

This gives you full control:

- Create any offer with any name (e.g. "Summer Trends", "Festive Sweets")
- Choose products via **Tag** (auto), **Category** (auto), or **Manual** (hand-picked)
- **Schedule** when an offer appears and disappears (start/end dates)
- **Toggle** an offer on/off anytime with a single click
- **Reorder** offers with sort order

---

## 2. The Offer Document

Each offer is stored in the `offers` collection with this structure:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Auto-generated (`offer-001`, `offer-002`, ...) |
| `name` | string | Title shown above the carousel (e.g. "Summer Trends") |
| `slug` | string | Optional URL-friendly identifier |
| `description` | string | Optional subtitle |
| `type` | `"tag"` \| `"category"` \| `"manual"` | How products are selected |
| `tag` | string | Product tag (only for `type = "tag"`) |
| `categoryId` | string | Category ID (only for `type = "category"`) |
| `productIds` | string[] | Explicit product list (only for `type = "manual"`) |
| `bannerImage` | string \| object | Optional Cloudinary image |
| `startsAt` | Date | When the offer becomes visible (optional) |
| `endsAt` | Date | When the offer stops being visible (optional) |
| `isActive` | boolean | Manual override toggle |
| `sortOrder` | number | Display priority (0 = first) |
| `createdAt` / `updatedAt` | Date | Timestamps |

---

## 3. How Products Are Selected

### Type 1 — By Tag (`type = "tag"`)

The offer stores a single `tag` value. The system finds **all published products** whose `tags` array contains that tag (case-insensitive).

```
Offer { name: "Summer Trends", type: "tag", tag: "summer" }
        │
        ▼  /api/offers/offer-001/products
Product.find({ isPublished: true, tags: /^summer$/i })
        │
        ▼
All products tagged "summer" → carousel section
```

- **Products tagged later** automatically appear in the offer — no edits needed.
- If you **remove the tag** from a product, it disappears from the offer.
- If the tag matches **no products**, the section is not rendered.

### Type 2 — By Category (`type = "category"`)

The offer stores a single `categoryId`. The system finds **all published products** whose `categoryId` matches.

```
Offer { name: "Farm Fresh", type: "category", categoryId: "cat-001" }
        │
        ▼  /api/offers/offer-003/products
Product.find({ isPublished: true, categoryId: "cat-001" })
        │
        ▼
All products in that category → carousel section
```

- **Products added to the category later** automatically appear in the offer — no edits needed.
- Categories already exist on every product, so **no tag maintenance is required**.
- If the category has **no published products**, the section is not rendered.

### Type 3 — Manual (`type = "manual"`)

The offer stores an explicit `productIds` array (the order you selected them in is preserved).

```
Offer { name: "Festive Sweets", type: "manual", productIds: ["ind-005", "ind-012", "ind-027"] }
        │
        ▼  /api/offers/offer-002/products
Product.find({ isPublished: true, id: { $in: productIds } })
        │
        ▼  sorted back into your chosen order
Exactly those 3 products → carousel section
```

- **Only published, existing products** are returned — unpublished/deleted products are skipped automatically.
- **Manual order is preserved** as you selected them in the admin form.

---

## 4. Scheduling & Visibility Rules

An offer is returned by `/api/offers` and shown on the storefront **only if**:

```
isActive === true  AND  now >= startsAt  AND  now <= endsAt
```

- **`startsAt` / `endsAt` are optional** — if left empty, that side of the window is ignored (offer is always in schedule while active).
- **`isActive` is the manual override** — you can force an offer off (or on) even within its scheduled window.

### Status Badges (Admin)

| Badge | Condition |
|-------|-----------|
| 🟢 **Active** | `isActive` ON and now is within schedule |
| 🔵 **Scheduled** | `isActive` ON but start date is in the future |
| 🟠 **Expired** | `isActive` ON but end date has passed |
| ⚪ **Inactive** | `isActive` OFF (hidden regardless of dates) |

> **Note:** Expired/scheduled offers remain in the admin list (so you can edit/reuse them) but are **not** returned by the public API.

---

## 5. End-to-End Data Flow

```
ADMIN PANEL
  Admin → Offers → Add Offer
  Choose type (Tag, Category, or Manual), set name, dates, active, sort order
        │
        ▼ saved via POST /api/admin/offers
DATABASE (MongoDB)
  offers:  { id: "offer-001", name, type, tag | categoryId | productIds, startsAt, endsAt, isActive, sortOrder }
        │
        ▼ public API
GET /api/offers          → active + in-scheduled offers, sorted by sortOrder
GET /api/offers/:id/products → products resolved server-side (tag, category, or manual)
        │
        ▼ homepage (client)
src/app/page.tsx → loadOffers()
  for each offer: const offerProducts = await getOfferProducts(offer.id)
  if offerProducts.length > 0 → push { id, title: offer.name, products }
        │
        ▼
<SeasonalOffersCarousel sections={offerSections} />
  one horizontal scrollable row per offer
```

### Key Files

| File | Role |
|------|------|
| `src/lib/models/Offer.ts` | Mongoose Offer model |
| `src/app/api/offers/route.ts` | Public: list active, in-schedule offers |
| `src/app/api/offers/[id]/products/route.ts` | Public: resolve an offer's products (tag/category/manual) |
| `src/app/api/admin/offers/route.ts` | Admin: list / create offers |
| `src/app/api/admin/offers/[id]/route.ts` | Admin: update / delete offers (+ Cloudinary cleanup) |
| `src/app/admin/(dashboard)/offers/page.tsx` | Admin UI — full CRUD |
| `src/lib/api/offers.ts` | Client helpers (`getActiveOffers`, `getOfferProducts`, `OfferSection`) |
| `src/components/SeasonalOffersCarousel.tsx` | Renders carousel rows |
| `src/app/page.tsx` | Fetches offers + products, renders carousels |

---

## 6. The `OfferSection` Type

```ts
export interface OfferSection {
  id: string;          // e.g. "offer-offer-001"
  title: string;       // e.g. "Summer Trends"
  products: Product[]; // resolved products for this section
}
```

---

## 7. The Carousel Component

`src/components/SeasonalOffersCarousel.tsx`:

- **Props:** `{ sections: OfferSection[] }`
- Renders **nothing** if `sections` is empty.
- For each section, renders a `CarouselRow`:
  - **Header:** section title + item count
  - **Scrollable track:** horizontally scrollable flex row of `ProductCard`s (200px wide each)
  - **Arrows:** left/right chevron buttons that appear on hover, scroll by 2 cards
  - **Snap scrolling:** `snap-x snap-mandatory` for smooth card snapping
  - **Scroll detection:** `ResizeObserver` + scroll listener to show/hide arrows

---

## 8. The TypeScript Types

```ts
// src/lib/api/offers.ts
export interface Offer {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  type: "tag" | "category" | "manual";
  tag?: string;
  categoryId?: string;
  productIds?: string[];
  bannerImage?: unknown;
  startsAt?: string;
  endsAt?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}
```

---

## 9. How to Create an Offer (Quick Steps)

### ✅ Option A — By Tag ("Summer Trends")

1. In **Admin → Products**, add the tag `summer` to the products you want (comma-separated field).
2. In **Admin → Offers → Add Offer**:
   - **Offer Name:** `Summer Trends`
   - **Selection Type:** 🏷️ By Tag
   - **Tag:** `summer`
   - **Start Date / End Date:** e.g. `2026-06-01` → `2026-08-31`
   - **Active:** ✅
3. Save. The carousel appears automatically on the homepage within the date window.

### ✅ Option B — By Category ("Farm Fresh Vegetables")

1. In **Admin → Offers → Add Offer**:
   - **Offer Name:** `Farm Fresh Vegetables`
   - **Selection Type:** 📂 By Category
   - **Category:** pick a category (e.g. "Vegetables")
   - **Start / End Dates:** e.g. `2026-06-01` → `2026-08-31`
   - **Active:** ✅
2. Save. All published products in that category appear automatically — including ones added later.

### ✅ Option C — Manual ("Festive Sweets")

1. In **Admin → Offers → Add Offer**:
   - **Offer Name:** `Festive Sweets`
   - **Selection Type:** 👆 Manual
   - **Products:** use the search box (and optional category filter) to find & check the exact products
   - **Start / End Dates:** e.g. `2026-10-01` → `2026-12-31`
   - **Active:** ✅
2. Save. Exactly the selected products appear, in your chosen order.

> **Note:** Products are selected from **one source only** (tag, category, or manual) per offer — a carousel cannot mix sources. Products **can** still appear in multiple offers across different sources.

---

## 10. API Route Reference

### Public Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/offers` | Active, in-schedule offers (sorted by `sortOrder`) |
| GET | `/api/offers/:id/products` | Resolved products for one offer |

### Admin Routes (Owner only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/offers` | List all offers (incl. inactive/expired) |
| POST | `/api/admin/offers` | Create an offer |
| PUT | `/api/admin/offers/:id` | Update an offer |
| DELETE | `/api/admin/offers/:id` | Delete an offer (+ Cloudinary banner cleanup) |

### Products API (enhanced)

`GET /api/products` now also supports:

| Query Param | Description | Example |
|-------------|-------------|---------|
| `tags` | Comma-separated tags; matches any (case-insensitive) | `?tags=summer,festival` |
| `ids` | Comma-separated product IDs | `?ids=ind-001,ind-005` |

---

## 11. Common Questions

**Q: Why isn't my offer showing on the homepage?**
- Check the **Active** toggle is ON.
- Check the current time is between **Start Date** and **End Date**.
- Check at least one published product matches (tag/category type) or is selected (manual type).

**Q: Can I combine tag + category + manual products in one offer?**
- No. Each offer uses **exactly one** selection source (tag, category, or manual). This keeps the model simple and avoids duplicate/missing items. Create separate offers per source if needed.

**Q: Can a product appear in multiple offers?**
- Yes. A product tagged `summer` and `deal` appears in every offer that uses either tag, and in any manual offer you select it in.

**Q: How do I stop an offer mid-schedule?**
- Toggle its **Active** switch OFF in Admin → Offers. It hides immediately. Toggle back ON to show it again.

**Q: How do I reorder offers?**
- Set **Sort Order** (lower = first). Offers are sorted ascending by `sortOrder`.

**Q: What happens when an offer's end date passes?**
- It stops being served by `/api/offers` (badge shows **Expired** in admin). It stays in the admin list so you can extend the dates or reuse it.

**Q: Do I still need product tags?**
- Only if you use **By Tag** offers. For **Manual** and **By Category** offers, tags are irrelevant — category offers auto-include everything in the category with zero maintenance.

**Q: What if no offers are active?**
- `offerSections` is an empty array → `SeasonalOffersCarousel` renders nothing.