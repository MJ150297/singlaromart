# Indiyano Admin Panel — Complete Guide

This documentation explains how the admin panel works, covering everything from getting started to managing all store content: categories, subcategories, products, banners, and orders.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Dashboard Overview](#2-dashboard-overview)
3. [Managing Categories & Subcategories](#3-managing-categories--subcategories)
4. [Managing Products](#4-managing-products)
5. [Managing Banners](#5-managing-banners)
6. [Managing Offers](#6-managing-offers)
7. [Managing Orders](#7-managing-orders)
8. [Data Model & Architecture](#8-data-model--architecture)
9. [Storefront Behavior](#9-storefront-behavior)

---

## 1. Getting Started

### Accessing the Admin Panel

| Step | Action |
|------|--------|
| **1** | Navigate to `/admin/login` in your browser |
| **2** | Log in with your admin credentials |
| **3** | You'll be redirected to the **Dashboard** at `/admin/dashboard` |

### First-Time Setup (Creating the Owner Account)

If this is your first time using the admin panel, you need to create the owner account:

1. Go to `/admin/signup`
2. Fill in:
   - **Name** (minimum 3 characters)
   - **Email** (valid email address)
   - **Password** (minimum 8 characters)
   - **Confirm Password**
3. Submit the form — the first account created becomes the **Owner** with full access

> ⚠️ **Important**: Only the owner account can manage categories, products, banners, and orders. The signup page will show a "setup already complete" message if an owner already exists.

### Admin Navigation

Once logged in, the admin sidebar shows these sections:

| Section | URL | Purpose |
|---------|-----|---------|
| **Dashboard** | `/admin/dashboard` | Store performance overview |
| **Products** | `/admin/products` | Manage the product catalog |
| **Categories** | `/admin/categories` | Manage categories & subcategories |
| **Banners** | `/admin/banners` | Manage hero carousel banners |
| **Offers** | `/admin/offers` | Manage dynamic homepage carousel offers |
| **Orders** | `/admin/orders` | View and manage customer orders |

---

## 2. Dashboard Overview

The dashboard at `/admin/dashboard` provides a real-time overview of your store:

### Stat Cards

| Card | Description |
|------|-------------|
| **Total Products** | Total number of products in the catalog |
| **Total Orders** | Total orders placed by customers |
| **Total Revenue** | Sum of all delivered/confirmed order amounts |
| **Pending Orders** | Orders still awaiting processing |

Each card is clickable and takes you to the relevant management page.

### Recent Orders Panel

Shows the latest 5 orders with:
- Customer name
- Order ID and item count
- Total amount
- Status badge (pending/confirmed/out_for_delivery/delivered/cancelled)

### Low Stock Alerts Panel

Lists products where `stockQuantity < 10`, showing:
- Product name and unit
- Items remaining
- Quick link to manage products

---

## 3. Managing Categories & Subcategories

Navigate to **`/admin/categories`** to manage your product taxonomy.

### Understanding the Hierarchy

```
Category (e.g. "Dairy & Paneer")
└── Subcategory (e.g. "Milk & Curd")
    └── Products (e.g. "Amul Milk", "Mother Dairy Curd")
```

### Creating a New Category

1. Click **"+ Add Category"**
2. Fill in the fields:

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| **Category Name** | ✅ | Display name of the category | `Dairy & Paneer` |
| **Icon (emoji)** | ❌ | Emoji shown in the mega menu | `🧀` |
| **Image URL** | ❌ | Banner image for the category | `/images/cat-dairy.jpg` |

3. Click **"Save Category"**

### Adding Subcategories

Within the category form, use the **"Add Subcategory"** button. Each subcategory has:

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| **Name** | ✅ | Display name of the subcategory | `Milk & Curd` |
| **Slug** | ❌ | URL-friendly identifier (auto-generated from name if left blank) | `milk-curd` |
| **Image URL** | ❌ | Image shown in the mega menu submenu | `/images/sub-milk.jpg` |

> 💡 **Note**: The system automatically generates a unique **ID** (e.g. `sub-dairy-1`) and a **slug** (e.g. `milk-curd`) for each subcategory. You can override the slug manually.

### Editing a Category

- Click the **pencil icon** on any category card
- Modify any field, including adding/removing subcategories
- Click **"Save Category"**

### Deleting a Category

- Click the **trash icon** on any category card
- Confirm the deletion

> ⚠️ **Warning**: Deleting a category does not automatically delete its products. You should reassign or remove products first.

### Practical Example

To set up a dairy section:

```
Category: "Dairy & Paneer" (icon: 🧀)
├── Subcategory: "Milk & Curd" (slug: milk-curd)
├── Subcategory: "Paneer" (slug: paneer)
├── Subcategory: "Cheese" (slug: cheese)
└── Subcategory: "Butter & Ghee" (slug: butter-ghee)
```

Then assign products to each subcategory (see [Managing Products](#4-managing-products)).

---

## 4. Managing Products

Navigate to **`/admin/products`** to manage your product catalog.

### Product Form Sections

When you click **"+ Add Product"**, the form is organized into 5 sections:

#### Section 1: Basics

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| **Product Name** | ✅ | Full product name | `Fresh Paneer (Cottage Cheese)` |
| **Category** | ✅ | Select from existing categories (dropdown) | `Dairy & Paneer` |
| **Unit** | ✅ | Primary/default unit | `250 g` |
| **Price (₹)** | ✅ | Selling price | `100` |
| **Original Price (₹)** | ❌ | MRP for strikethrough display | `120` |
| **Discount (%)** | ❌ | Discount percentage (shown as badge) | `17` |
| **Slug** | ❌ | URL-friendly identifier | `fresh-paneer` |
| **Origin** | ❌ | Source/region | `India` |
| **Badges** | ❌ | Comma-separated badges | `Best Seller, Fresh` |

#### Section 2: Images

| Field | Description | Example |
|-------|-------------|---------|
| **Main Image URL** | Primary product image | `/images/paneer.jpg` |
| **Additional Images** | Gallery images (add multiple) | `/images/paneer-2.jpg` |

#### Section 3: Variants

Variants allow you to define **multiple size/weight options** for the same product, each with its own pricing. This is perfect for products like milk available in 500ml, 1L, and 2L pack sizes.

Each variant has:

| Field | Description | Example |
|-------|-------------|---------|
| **Unit** | Size/weight label | `500 ml`, `1 L`, `2 L` |
| **Price ₹** | Selling price for this size | `28`, `55`, `100` |
| **Original ₹** | MRP for this size (optional) | `32`, `65`, `120` |
| **% off** | Discount for this size (optional) | `12`, `15`, `17` |
| **In stock** | Whether this size is available | ✅/❌ |

Click **"+ Add Variant"** to add more sizes, and the trash icon to remove one.

> 💡 Products with variants show **size selector buttons** on the product detail page.

#### Section 4: Details

| Field | Description | Example |
|-------|-------------|---------|
| **Description** | HTML-supported description shown on product page | `<p><strong>Farm-Fresh...</strong></p>` |
| **Nutritional Highlights** | One per line | `Rich in protein` |
| **Storage Info** | Storage instructions | `Keep refrigerated at 2-4°C` |
| **Health Fact** | Fun/educational fact | `Paneer is a complete protein...` |
| **Tags** | Comma-separated for search & seasonal offers | `festival, deal, staple` |

#### Section 5: Subcategories

- **Checkboxes** appear with all subcategories of the **selected category**
- Select one or more subcategories this product belongs to
- Example: Selecting "Dairy & Paneer" category shows checkboxes for `Milk & Curd`, `Paneer`, `Cheese`, `Butter & Ghee`
- Select "Paneer" to link the product

> 💡 **Tip**: A product can belong to multiple subcategories (e.g. "Mango Beverage" belongs to both "Fruit Juices" and "Health Drinks").

#### Section 6: Inventory & Status

| Field | Description |
|-------|-------------|
| **Stock Quantity** | Available units (low stock warning shows when < 10) |
| **In Stock** | Toggle to mark product availability |
| **Published** | Toggle to show/hide on storefront |

### Searching Products

Use the **search bar** at the top of the products page to filter by name.

### Editing / Deleting Products

- **Edit**: Click the pencil icon → modify fields → Save
- **Delete**: Click the trash icon → confirm

---

## 5. Managing Banners

Navigate to **`/admin/banners`** to manage the hero carousel on the homepage.

### Creating a New Banner

Click **"+ Add Banner"** and fill in:

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| **Title** | ✅ | Main headline | `Fresh Groceries Delivered` |
| **Subtitle** | ❌ | Secondary text | `Order before 10 AM for same-day delivery` |
| **Badge** | ❌ | Small label above title | `NEW` |
| **CTA Text** | ❌ | Call-to-action button label | `Shop Now` |
| **Gradient** | ❌ | Background color scheme | `Emerald → Teal` |
| **Image URL** | ❌ | Background image (optional) | `/images/banner.jpg` |
| **Order** | ❌ | Display priority (0 = first) | `0` |
| **Active** | ❌ | Toggle to show/hide on homepage | ✅ |

### Available Gradient Options

| Option | Gradient Class |
|--------|---------------|
| Emerald → Teal | `from-emerald-500 to-teal-600` |
| Orange → Rose | `from-orange-500 to-rose-600` |
| Blue → Indigo | `from-blue-500 to-indigo-600` |
| Purple → Pink | `from-purple-500 to-pink-600` |
| Amber → Orange | `from-amber-500 to-orange-600` |

### Quick Toggle

- Click the **Active/Inactive** pill on any banner to toggle its visibility without opening the edit form.

### Editing / Deleting Banners

- **Edit**: Click the pencil icon → modify fields → Save
- **Delete**: Click the trash icon → confirm

---

## 6. Managing Offers

Navigate to **`/admin/offers`** to manage the dynamic carousel offers on the homepage.

Offers are **fully database-driven** — there is no hardcoded festival/season/time logic. Every carousel section on the homepage is an Offer you create and control from this page.

### Creating a New Offer

Click **"+ Add Offer"** and fill in:

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| **Offer Name** | ✅ | Title shown above the carousel | `Summer Trends` |
| **Slug** | ❌ | URL-friendly identifier (auto-generated from name) | `summer-trends` |
| **Sort Order** | ❌ | Display priority (0 = first) | `0` |
| **Description** | ❌ | Short subtitle shown above the carousel | `Refreshing picks for the hot season` |
| **Selection Type** | ✅ | How products are chosen (Tag, Category, or Manual) | `By Tag` |
| **Tag** | ✅ (if Tag) | Product tag that auto-selects products | `summer` |
| **Category** | ✅ (if Category) | Category that auto-selects products | `Vegetables` |
| **Products** | ✅ (if Manual) | Hand-picked product list (with load-more) | — |
| **Banner Image** | ❌ | Optional banner image | `/images/offer.jpg` |
| **Start Date** | ❌ | When the offer becomes visible | `2026-06-01 00:00` |
| **End Date** | ❌ | When the offer stops being visible | `2026-08-31 23:59` |
| **Active** | ❌ | Manual override toggle | ✅ |

### Selection Types

| Type | Behavior |
|------|----------|
| **🏷️ By Tag** | Auto-includes **all published products** carrying the given tag. Type a tag (with autocomplete from existing product tags). |
| **📂 By Category** | Auto-includes **all published products** in the selected category. |
| **👆 Manual** | Hand-pick **exact products** from a searchable, paginated list. The selected order is preserved. |

### Enterprise Features

The offers page includes several enterprise-grade capabilities:

- **Summary stat cards** — Active / Scheduled / Expired / Inactive counts at a glance.
- **Search & filters** — Search by name, filter by type (tag/category/manual) and status.
- **Pagination** — Offers are paginated (25 per page) for large catalogs.
- **Reorder** — Use the up/down arrows on each offer to change display order without editing.
- **Duplicate** — Copy an existing offer (as inactive) to quickly spin up a similar campaign.
- **Product-count preview** — Tag/category offers show how many products will appear.
- **Offer preview** — Preview the carousel before saving.
- **Toasts & confirmations** — Success/error toasts and a styled delete confirmation dialog.
- **Auto-slug** — Slug auto-generates from the name (editable override).
- **Date validation** — Inline error if the end date is before the start date.

### Security & Validation

- All offer payloads are **field-whitelisted** server-side (no arbitrary data injection).
- **Server-side validation** enforces name, type consistency, `endsAt >= startsAt`, and sort order.
- **Slug uniqueness** is enforced (case-insensitive).
- **Duplicate detection** rejects an active offer that reuses the same tag or category.
- **Rate limiting** protects create/update/delete endpoints.
- An **audit trail** (`createdBy`/`updatedBy`) records who made each change.

### Scheduling & Visibility

An offer is shown on the storefront **only if**:
- `isActive` is **ON**, **AND**
- `now >= startsAt` (if set), **AND**
- `now <= endsAt` (if set)

| Status Badge | Meaning |
|--------------|---------|
| **Active** | Visible on the storefront now |
| **Scheduled** | Active toggle is ON, but start date is in the future |
| **Expired** | Active toggle is ON, but end date has passed |
| **Inactive** | Active toggle is OFF (hidden regardless of dates) |

> 💡 **Tip**: Leave dates empty for an always-visible offer (while active). Use the **Active** toggle to temporarily show/hide an offer mid-schedule.

### Quick Toggle

- Click the **On/Off** pill on any offer to toggle its visibility without opening the edit form.

### Editing / Deleting Offers

- **Edit**: Click the pencil icon → modify fields → Save
- **Delete**: Click the trash icon → confirm

---

## 7. Managing Orders

Navigate to **`/admin/orders`** to manage customer orders.

### Order Status Filter

Filter orders by status using the buttons at the top:

| Status | Description |
|--------|-------------|
| **All** | Show all orders |
| **Pending** | New order, awaiting confirmation |
| **Confirmed** | Order accepted, being prepared |
| **Out For Delivery** | Order with delivery partner |
| **Delivered** | Successfully delivered |
| **Cancelled** | Cancelled by customer or admin |

### Updating Order Status

1. Each order card shows a **status dropdown** with the current status
2. Select the new status to update it immediately
3. A spinner indicates the update is saving

### Viewing Order Details

Click **"View"** on any order to expand:

- **Items**: Product name, quantity, unit, line total
- **Customer Details**: Phone, delivery address, delivery slot, payment method

### Order Status Workflow

```
Pending → Confirmed → Out For Delivery → Delivered
   ↓
Cancelled
```

---

## 8. Data Model & Architecture

### MongoDB Collections

| Collection | Purpose |
|------------|---------|
| `users` | Admin/user accounts with roles |
| `categories` | Categories with embedded subcategories |
| `products` | Full product catalog with variants |
| `banners` | Hero carousel slides |
| `offers` | Dynamic homepage carousel offers |
| `orders` | Customer orders with items & status |

### Data Relationships

```
Category
├── id: string (e.g. "Dairy")
├── name: string
├── icon: string (emoji)
├── image: string
└── subcategories: [
      { id: "sub-dairy-1", name: "Milk & Curd", slug: "milk-curd", image: "/images/sub-milk.jpg" },
      { id: "sub-dairy-2", name: "Paneer", slug: "paneer", image: "/images/sub-paneer.jpg" }
    ]

Product
├── id: string (e.g. "ind-001")
├── name: string
├── category: string (display name)
├── categoryId: string (references Category.id)
├── subcategories: string[] (subcategory names for backward compat)
├── subcategoryId: string (references subcategory.id)
├── price: number
├── unit: string (e.g. "5 kg")
├── variants: [
      { unit: "1 kg", price: 140, originalPrice: 170, discountPercent: 18, inStock: true },
      { unit: "5 kg", price: 650, originalPrice: 780, discountPercent: 17, inStock: true }
    ]
├── stockQuantity: number
├── isPublished: boolean
└── tags: string[]

Banner
├── id: string
├── title: string
├── subtitle: string
├── badge: string
├── gradient: string (Tailwind gradient classes)
├── order: number (sort order)
└── isActive: boolean

Offer
├── id: string (e.g. "offer-001")
├── name: string (e.g. "Summer Trends")
├── slug: string
├── description: string
├── type: "tag" | "manual"
├── tag: string (for type = "tag")
├── productIds: string[] (for type = "manual")
├── bannerImage: string | CloudinaryImage
├── startsAt: Date
├── endsAt: Date
├── isActive: boolean
└── sortOrder: number
```

### API Routes

#### Public Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/categories` | Fetch all categories with subcategories |
| GET | `/api/products` | Fetch products with filtering (category, subcategory, subcategoryId, search, sort, pagination) |
| GET | `/api/products/:id` | Fetch a single product |
| GET | `/api/banners` | Fetch active banners sorted by order |
| GET | `/api/offers` | Fetch active, in-schedule offers |
| GET | `/api/offers/:id/products` | Fetch products for an offer (tag or manual) |
| GET | `/api/orders/my` | Fetch customer's own orders |

#### Admin Routes (Owner-only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/admin/categories` | List / create categories |
| PUT/DELETE | `/api/admin/categories/:id` | Update / delete categories |
| GET/POST | `/api/admin/products` | List / create products |
| PUT/DELETE | `/api/admin/products/:id` | Update / delete products |
| GET/POST | `/api/admin/banners` | List / create banners |
| PUT/DELETE | `/api/admin/banners/:id` | Update / delete banners |
| GET/POST | `/api/admin/offers` | List / create offers |
| PUT/DELETE | `/api/admin/offers/:id` | Update / delete offers |
| GET | `/api/admin/orders` | List orders (filterable by status) |
| PATCH | `/api/admin/orders/:orderId` | Update order status |
| GET | `/api/admin/stats` | Dashboard statistics |

---

## 9. Storefront Behavior

Here's how admin panel changes reflect on the customer-facing storefront:

| Admin Action | Storefront Effect |
|--------------|-------------------|
| **Create/Edit Category** | Appears in the **MegaMenu** category pills on the homepage |
| **Add Subcategory** | Appears in the **category page sidebar** and **MegaMenu dropdown** |
| **Edit Subcategory slug** | Changes the URL used for subcategory links |
| **Add Product** | Appears in **product grids**, **search results**, and **category pages** |
| **Add Variants** | Shows **size selector buttons** on the product detail page |
| **Set Published = off** | Product hidden from storefront |
| **Set In Stock = off** | "Out of stock" state on the product card |
| **Set Stock < 10** | Low stock warning on admin dashboard |
| **Create Banner** | Appears in the **hero carousel** on the homepage (if active) |
| **Toggle Banner active** | Shows/hides banner from carousel |
| **Reorder Banner** | Changes carousel slide order |
| **Create Offer** | Appears as a **carousel section** on the homepage (if active & in schedule) |
| **Toggle Offer active** | Shows/hides the offer carousel |
| **Set Offer dates** | Auto-shows/hides the offer based on schedule |
| **Update Order Status** | Reflected on the customer's **order tracking page** |

### Immediate Updates

All storefront data is fetched from the API on every page load — **no caching**. Any change you make in the admin panel appears on the storefront immediately after refreshing.

---

## Tips & Best Practices

1. **Plan your category hierarchy first** — Create categories and subcategories before adding products.
2. **Use meaningful slugs** — Slugs appear in URLs (e.g. `/category/Dairy?sub=milk-curd`), so keep them short and descriptive.
3. **Use variants for size options** — Instead of creating separate products for each size, use variants (e.g. Milk 500ml, 1L, 2L as one product with variants).
4. **Toggle "Published" off while preparing** — Create products in draft mode, then publish when ready.
5. **Set original prices** — Original prices enable discount badges and strikethrough pricing, making products more attractive.
6. **Use tags for offer campaigns** — Tags like `summer`, `festival`, `diwali` power the dynamic offer carousels. Create an offer with type "By Tag" and enter the tag.
7. **Keep stock updated** — The dashboard highlights low-stock products so you can restock in time.
