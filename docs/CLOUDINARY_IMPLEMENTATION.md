# Cloudinary Implementation Plan

**Status:** Configuration exists but **upload functionality not implemented**  
**Date:** 2026-08-09

---

## Current State Assessment

### ✅ What's Already In Place

1. **Configuration**
   - `src/lib/config.ts` exports Cloudinary credentials
   - `.env.local.example` has placeholder values
   - Environment variables: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

2. **Next.js Setup**
   - `next.config.ts` allows remote images from `res.cloudinary.com`
   - Security headers configured

3. **Data Schema**
   - `src/lib/schemas.ts` defines `CloudinaryImageSchema` with transformation URLs
   - Mongoose `Product` model has `CloudinaryImageSchema` sub-schema
   - Support for `transformations: { thumbnail, card, detail, zoom }`

4. **Image Component**
   - `src/components/ProductImage.tsx` handles both string URLs and CloudinaryImage objects
   - Falls back to placeholder on error
   - Uses `next/image` with `fill` layout

5. **Admin UI**
   - Product, banner, and category pages have image URL input fields
   - Support for multiple images on products

### ❌ What's Missing

1. **Upload API Endpoint**
   - No `POST /api/upload` endpoint
   - No server-side Cloudinary SDK integration
   - No file validation or error handling

2. **Client-side Upload**
   - No upload UI in admin forms
   - No file picker or drag-drop
   - No progress tracking
   - No error feedback

3. **Transformation Generation**
   - No automatic transformation URL generation
   - Manual URL entry required
   - No preset or optimization logic

4. **Migration**
   - No script to convert existing string URLs to structured Cloudinary objects
   - Legacy image strings will remain as-is

5. **Utilities**
   - No Cloudinary URL builder
   - No response type definitions
   - No helper functions for transformations

---

## Implementation Plan

### Phase 1: Server-Side Upload API (Priority: HIGH)

#### 1.1 Install Cloudinary SDK
```bash
npm install cloudinary next-cloudinary
```

#### 1.2 Create Upload API Endpoint
**File:** `src/app/api/upload/route.ts`

Features:
- Accept multipart form-data (image file)
- Validate file type (jpg, png, webp, gif)
- Validate file size (max 5MB)
- Upload to Cloudinary with auto-tagging
- Generate transformation URLs automatically
- Return `CloudinaryImage` object
- Handle errors and return 400/500 responses

```typescript
export async function POST(req: Request) {
  // 1. Extract file from FormData
  // 2. Validate MIME type and size
  // 3. Upload using cloudinary.v2.uploader.upload()
  // 4. Generate transformations for thumbnail, card, detail, zoom
  // 5. Return structured response with CloudinaryImage
}
```

#### 1.3 Create Cloudinary Utility Module
**File:** `src/lib/cloudinary.ts`

Functions:
- `uploadImage(file: File): Promise<CloudinaryImage>`
- `buildTransformationUrl(publicId: string, preset: 'thumbnail' | 'card' | 'detail' | 'zoom'): string`
- `deleteImage(publicId: string): Promise<void>`
- `getImageMetadata(publicId: string): Promise<{width, height}>`

```typescript
export const CLOUDINARY_PRESETS = {
  thumbnail: "w_200,h_200,c_fill,q_auto",
  card: "w_400,h_400,c_fill,q_auto",
  detail: "w_800,h_800,c_fill,q_auto",
  zoom: "w_1200,h_1200,c_fill,q_auto",
};

export function buildImageUrl(publicId: string, preset: string): string {
  const config = config.cloudinary;
  return `https://res.cloudinary.com/${config.cloudName}/image/upload/${preset}/${publicId}`;
}
```

#### 1.4 Type Definitions
**File:** `src/lib/cloudinary.types.ts`

```typescript
export interface CloudinaryUploadResponse {
  event_id: string;
  public_id: string;
  version: number;
  signature: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  created_at: string;
  tags: string[];
  bytes: number;
  type: string;
  etag: string;
  placeholder: boolean;
  url: string;
  secure_url: string;
  folder: string;
  original_filename: string;
}
```

---

### Phase 2: Admin Upload UI (Priority: HIGH)

#### 2.1 Create Upload Component
**File:** `src/components/ui/image-upload.tsx`

Features:
- File input with validation
- Drag-and-drop support
- Preview before upload
- Upload progress indicator
- Error messages
- Cancel button

```typescript
export function ImageUpload({ 
  onUpload: (image: CloudinaryImage) => void,
  onError: (error: string) => void,
  aspect?: number,
}: ImageUploadProps) {
  // 1. File selection with drag-drop
  // 2. Client-side validation
  // 3. POST to /api/upload
  // 4. Show progress
  // 5. Handle success/error
}
```

#### 2.2 Update Admin Forms
**Files:**
- `src/app/admin/(dashboard)/products/page.tsx`
- `src/app/admin/(dashboard)/banners/page.tsx`
- `src/app/admin/(dashboard)/categories/page.tsx`

Changes:
- Replace text input with `ImageUpload` component
- Store `CloudinaryImage` object instead of string URL
- Show preview of uploaded image
- Handle multiple images for products

---

### Phase 3: Database & Migration (Priority: MEDIUM)

#### 3.1 Update Mongoose Schema
Already done in `Product` model but ensure all collections follow:
- Image field accepts both string (legacy) and CloudinaryImage object
- Transformations sub-schema populated on upload

#### 3.2 Create Migration Script
**File:** `scripts/migrate-to-cloudinary.ts`

Purpose: Convert existing string image URLs to Cloudinary objects

```typescript
export async function migrateProductImagesToCloudinary() {
  // 1. Find all products with string image fields
  // 2. For each image URL:
  //    a. Download or fetch the image
  //    b. Upload to Cloudinary
  //    c. Extract publicId, generate transformations
  //    d. Update product document
  // 3. Log progress and errors
}
```

Run with:
```bash
npm run seed -- --cloudinary-migrate
```

---

### Phase 4: Transformation Optimization (Priority: MEDIUM)

#### 4.1 Preset Definitions
Define consistent transformation presets in `src/lib/cloudinary.ts`:

```typescript
export const TRANSFORMATION_PRESETS = {
  thumbnail: {
    width: 200,
    height: 200,
    crop: 'fill',
    quality: 'auto',
    gravity: 'auto',
  },
  card: {
    width: 400,
    height: 400,
    crop: 'fill',
    quality: 'auto',
    gravity: 'auto',
  },
  detail: {
    width: 800,
    height: 800,
    crop: 'fill',
    quality: 'auto',
    gravity: 'auto',
  },
  zoom: {
    width: 1200,
    height: 1200,
    crop: 'fill',
    quality: 'auto',
    gravity: 'auto',
  },
};
```

#### 4.2 Auto-generate on Upload
When uploading, automatically generate all transformation URLs:

```typescript
const image = await uploadToCloudinary(file);
const transformedImage: CloudinaryImage = {
  publicId: image.public_id,
  url: image.url,
  secureUrl: image.secure_url,
  width: image.width,
  height: image.height,
  alt: file.name,
  transformations: {
    thumbnail: buildUrl(image.public_id, PRESETS.thumbnail),
    card: buildUrl(image.public_id, PRESETS.card),
    detail: buildUrl(image.public_id, PRESETS.detail),
    zoom: buildUrl(image.public_id, PRESETS.zoom),
  },
};
```

---

### Phase 5: Error Handling & Validation (Priority: MEDIUM)

#### 5.1 Server-side Validation
In upload endpoint:
- File type: `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- File size: max 5MB
- Dimensions: min 100x100, max 10000x10000
- Rate limiting: max 10 uploads per minute per IP

#### 5.2 Error Handling
- Network errors from Cloudinary
- Timeout handling
- Retry logic for failed uploads
- Cleanup of failed uploads (delete from Cloudinary)

#### 5.3 Response Types
```typescript
export type UploadResponse = 
  | { success: true; image: CloudinaryImage }
  | { success: false; error: string; code: string };
```

---

### Phase 6: Product and Admin Pages Update (Priority: HIGH)

#### 6.1 Product Admin Page
**File:** `src/app/admin/(dashboard)/products/page.tsx`

Changes:
- Main image: text input → ImageUpload component
- Additional images: add ImageUpload button
- Show preview of uploaded images
- Update form to handle CloudinaryImage objects

#### 6.2 Banner Admin Page
**File:** `src/app/admin/(dashboard)/banners/page.tsx`

Changes:
- Image field: text input → ImageUpload component
- Preview thumbnail
- Handle Cloudinary response

#### 6.3 Category Admin Page
**File:** `src/app/admin/(dashboard)/categories/page.tsx`

Changes:
- Category image: text input → ImageUpload
- Subcategory images: text input → ImageUpload
- Multiple category icons support

---

### Phase 7: Front-end Optimizations (Priority: LOW)

#### 7.1 Image Loading States
- Skeleton loaders while image loads
- Blur-up effect for images
- Intersection observer for lazy loading

#### 7.2 Responsive Images
Update `ProductImage.tsx` to use responsive widths:

```typescript
const sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw";
```

#### 7.3 AVIF & Modern Formats
Configure Cloudinary to serve modern formats:
```
f_auto
```

---

## Implementation Sequence

1. **Week 1:**
   - [ ] Install Cloudinary SDK
   - [ ] Create `src/lib/cloudinary.ts` utility module
   - [ ] Create upload API endpoint `/api/upload`
   - [ ] Add type definitions

2. **Week 2:**
   - [ ] Create `ImageUpload` component
   - [ ] Update Product admin page
   - [ ] Add validation and error handling

3. **Week 3:**
   - [ ] Update Banner and Category admin pages
   - [ ] Create migration script
   - [ ] Test end-to-end flow

4. **Week 4:**
   - [ ] Optimize transformations
   - [ ] Add front-end image loading states
   - [ ] Performance testing and tuning

---

## Environment Setup Checklist

- [ ] Create Cloudinary account at cloudinary.com
- [ ] Get `CLOUDINARY_CLOUD_NAME`
- [ ] Get `CLOUDINARY_API_KEY`
- [ ] Get `CLOUDINARY_API_SECRET`
- [ ] Set values in `.env.local`
- [ ] Test upload endpoint locally
- [ ] Configure Cloudinary folder structure (optional: `/indiyano/products`, `/indiyano/banners`, etc.)
- [ ] Set up Cloudinary transformation presets (optional: dashboard)

---

## Testing Strategy

### Unit Tests
- Image URL building functions
- Transformation preset generation
- Validation logic

### Integration Tests
- Upload endpoint with various file types
- File size validation
- Transformation URL generation
- Database schema compatibility

### E2E Tests
- Admin upload flow
- Image preview rendering
- Storefront image display
- Mobile responsiveness

---

## Rollback Plan

If Cloudinary setup fails:
1. Revert to string-only image URLs
2. Keep schema backward-compatible (already supports both)
3. Admin pages fall back to manual URL input
4. No data loss

---

## Monitoring & Metrics

- [ ] Track upload success/failure rate
- [ ] Monitor Cloudinary API quota usage
- [ ] Image delivery performance
- [ ] Error frequency and types
- [ ] Admin user adoption of upload feature

---

## Future Enhancements

1. Batch uploads for multiple images
2. Crop/rotate before upload
3. AI-powered alt text generation
4. Image compression strategies
5. CDN caching optimization
6. WebP and AVIF automatic serving
7. Signed URLs for private images
8. Dynamic image resizing based on viewport
9. Image analytics (views, engagement)
10. Backup/restore functionality
