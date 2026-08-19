# Cloudinary Quick Reference

## Setup

### 1. Get Credentials

1. Sign up at [cloudinary.com](https://cloudinary.com)
2. Go to Dashboard
3. Copy:
   - **Cloud Name** → `CLOUDINARY_CLOUD_NAME`
   - **API Key** → `CLOUDINARY_API_KEY`
   - **API Secret** → `CLOUDINARY_API_SECRET`

### 2. Configure Environment

Add to `.env.local`:

```env
CLOUDINARY_CLOUD_NAME=demo
CLOUDINARY_API_KEY=123456789
CLOUDINARY_API_SECRET=secret_key_here
```

### 3. Verify

```bash
npm run dev
```

Open browser console and verify no image loading errors.

---

## Current Architecture

### Image Format

**Legacy (String):**
```typescript
image: "/images/product.jpg"
```

**Cloudinary (Structured):**
```typescript
image: {
  publicId: "indiyano/products/1725840827341-4f8a2c",
  url: "https://res.cloudinary.com/...",
  secureUrl: "https://res.cloudinary.com/...",
  width: 800,
  height: 800,
  alt: "Basmati Rice",
  transformations: {
    thumbnail: "https://res.cloudinary.com/.../w_300,h_300,c_fill.../...",
    card: "https://res.cloudinary.com/.../w_500,h_500,c_fill.../...",
    detail: "https://res.cloudinary.com/.../w_800,h_800,c_fill.../...",
    zoom: "https://res.cloudinary.com/.../w_1200,h_1200,c_fill.../..."
  }
}
```

### Folder Structure

```
indiyano/
├── products/            # Product main + gallery images
├── banners/             # Hero carousel banner images
├── categories/          # Category main images
└── subcategories/       # Subcategory images
```

---

## Implementation Progress

### ✅ Done

- [x] Configuration in `src/lib/config.ts`
- [x] Next.js remote patterns setup
- [x] ProductImage component with CloudinaryImage support
- [x] Zod schema with transformations
- [x] Mongoose schema with CloudinaryImageSchema
- [x] Upload API endpoint with auth + rate limiting
- [x] Admin upload UI (ImageUpload component)
- [x] File validation (type + size)
- [x] Transformation generation (4 presets)
- [x] Enterprise folder structure
- [x] Cascade cleanup on update (diff-based)
- [x] Cascade cleanup on delete (full)
- [x] Warning display for failed Cloudinary deletions

### ⏳ Pending

- [ ] Migration script for legacy string URLs (deferred)
- [ ] Background retry job for failed deletions
- [ ] Performance optimization (lazy loading, AVIF)

---

## File Reference

| File | Purpose |
|------|---------|
| `src/lib/cloudinary.ts` | Core utility: upload, delete, URL building, folder constants |
| `src/app/api/upload/route.ts` | Upload API endpoint with auth + rate limiting |
| `src/components/ui/image-upload.tsx` | Client-side upload component |
| `src/lib/config.ts` | Cloudinary credentials config |
| `src/lib/schemas.ts` | CloudinaryImageSchema definition |
| `next.config.ts` | Remote patterns & security headers |
| `src/lib/models/Product.ts` | Mongoose Product schema |
| `src/lib/models/Banner.ts` | Mongoose Banner schema |
| `src/lib/models/Category.ts` | Mongoose Category schema |
| `.env.local.example` | Environment variable template |
| `docs/CLOUDINARY_IMPLEMENTATION.md` | Full implementation guide |

---

## Common Tasks

### Display Product Image

```typescript
import ProductImage from "@/components/ProductImage";

export function MyComponent({ product }) {
  return (
    <ProductImage 
      image={product.image} 
      alt={product.name}
      className="w-full aspect-square rounded-lg"
    />
  );
}
```

### Upload an Image (Admin)

```typescript
import { ImageUpload } from "@/components/ui";

<ImageUpload
  value={form.image}
  label="Upload main image"
  folder="products"  // "products" | "banners" | "categories" | "subcategories"
  onUpload={(image) => patchForm({ image })}
  onError={(message) => setError(message)}
/>
```

### Fetch Products with Images

```typescript
import { getProducts } from "@/lib/catalog";

const products = await getProducts();
// Each product.image is either string or CloudinaryImage
```

---

## Upload Endpoint

**`POST /api/upload`**

| Aspect | Details |
|--------|---------|
| Auth | Requires `owner` role (401/403 if not) |
| Rate limit | 20/min, 200/hr per IP (429 on exceed) |
| Content-Type | `multipart/form-data` |
| Fields | `file` (required), `alt` (optional), `folder` (optional, defaults to `products`) |
| Allowed types | `image/jpeg`, `image/png`, `image/webp`, `image/gif` |
| Max size | 5MB |
| Response | `{ success: true, data: CloudinaryImage }` |

---

## Cascade Cleanup

### On Update (PUT)

When an entity is updated, old Cloudinary images that are **no longer referenced** are automatically deleted:

- **Products:** main + gallery images compared
- **Categories:** main + subcategory images compared
- **Banners:** single image compared

### On Delete (DELETE)

When an entity is deleted, **all its Cloudinary images are deleted**:

- **Product** → main + gallery images
- **Category** → main + subcategory images
- **Banner** → banner image

### Failure Handling

If Cloudinary deletion fails, the entity is still updated/deleted (DB is source of truth). Failures are returned as `warnings` in the API response and shown as amber banners in the admin UI.

---

## Troubleshooting

### Images Not Loading

1. Check `.env.local` has `CLOUDINARY_CLOUD_NAME`
2. Verify `next.config.ts` has `res.cloudinary.com` in remotePatterns
3. Check browser console for CORS errors
4. Test URL directly: `https://res.cloudinary.com/{cloud-name}/...`

### Upload Returns 401/403

- You must be logged in as an **owner** to upload images
- Check session/role in the auth system

### Upload Returns 429

- Rate limit exceeded (20/min or 200/hr per IP)
- Wait for the window to reset

### Upload Returns 400

- Check file type (must be jpeg/png/webp/gif)
- Check file size (must be ≤ 5MB)
- Check folder field (must be one of: products, banners, categories, subcategories)

### Old Images Not Deleted on Update

- Check the `warnings` array in the API response
- The entity was updated successfully, but Cloudinary deletion failed
- Retry deletion manually via Cloudinary dashboard

---

## Transformation URL Format

```
https://res.cloudinary.com/{CLOUD_NAME}/image/upload/{TRANSFORMATION}/{PUBLIC_ID}
```

**Examples:**

Thumbnail (300×300):
```
/w_300,h_300,c_fill,gravity_auto,f_auto,q_auto/
```

Card (500×500):
```
/w_500,h_500,c_fill,gravity_auto,f_auto,q_auto/
```

Detail (800×800):
```
/w_800,h_800,c_fill,gravity_auto,f_auto,q_auto/
```

Zoom (1200×1200):
```
/w_1200,h_1200,c_fill,gravity_auto,f_auto,q_auto/
```

---

## Resources

- [Cloudinary Docs](https://cloudinary.com/documentation)
- [Cloudinary Upload API](https://cloudinary.com/documentation/upload_api_reference)
- [Transformation Reference](https://cloudinary.com/documentation/transformation_reference)
- [Next.js Image Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/images)

---

## Support

For issues:
1. Check `docs/CLOUDINARY_IMPLEMENTATION.md` for detailed plan
2. Review `src/lib/cloudinary.ts` for utility functions
3. Consult `src/components/ui/image-upload.tsx` for component usage
4. See Cloudinary Dashboard for upload/account issues
