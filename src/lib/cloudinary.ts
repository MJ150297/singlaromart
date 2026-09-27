import { config } from "./config";
import { type CloudinaryImage } from "./schemas";
import { type UploadApiResponse, v2 as cloudinary } from "cloudinary";

const { cloudName, apiKey, apiSecret } = config.cloudinary;

if (!cloudName || !apiKey || !apiSecret) {
  throw new Error(
    "Cloudinary config is incomplete. Ensure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are set."
  );
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

// ─── Folder structure ─────────────────────────────────────────────────────────
// Enterprise folder layout on Cloudinary:
//   <prefix>/products/       — product main + gallery images
//   <prefix>/banners/        — hero carousel banners
//   <prefix>/categories/     — category main images
//   <prefix>/subcategories/  — subcategory images
// The prefix is env-driven (server-only) so each business stores its images
// under its own Cloudinary folder. The default stays "indiyano" for backward
// compatibility with existing uploads — old public_ids remain valid.
const CLOUDINARY_FOLDER_PREFIX = process.env.CLOUDINARY_FOLDER_PREFIX || "indiyano";

export const CLOUDINARY_FOLDERS = {
  products: `${CLOUDINARY_FOLDER_PREFIX}/products`,
  banners: `${CLOUDINARY_FOLDER_PREFIX}/banners`,
  categories: `${CLOUDINARY_FOLDER_PREFIX}/categories`,
  subcategories: `${CLOUDINARY_FOLDER_PREFIX}/subcategories`,
  offers: `${CLOUDINARY_FOLDER_PREFIX}/offers`,
} as const;

export type CloudinaryFolder = keyof typeof CLOUDINARY_FOLDERS;

// ─── Transformation presets ───────────────────────────────────────────────────
// All presets use:
//   c_fill       — crop to fill, keeping aspect ratio
//   gravity_auto — automatic subject-aware cropping (faces/important regions)
//   f_auto       — serve best format (WebP/AVIF) based on browser
//   q_auto       — auto quality (balances file size and visual fidelity)
export const TRANSFORMATION_PRESETS = {
  thumbnail: "w_300,h_300,c_fill,gravity_auto,f_auto,q_auto",
  card: "w_500,h_500,c_fill,gravity_auto,f_auto,q_auto",
  detail: "w_800,h_800,c_fill,gravity_auto,f_auto,q_auto",
  zoom: "w_1200,h_1200,c_fill,gravity_auto,f_auto,q_auto",
} as const;

export function buildCloudinaryUrl(
  publicId: string,
  preset: keyof typeof TRANSFORMATION_PRESETS
): string {
  const safePublicId = encodeURIComponent(publicId).replace(/%2F/g, "/");
  return `https://res.cloudinary.com/${cloudName}/image/upload/${TRANSFORMATION_PRESETS[preset]}/${safePublicId}`;
}

export function buildCloudinaryImageObject(
  result: UploadApiResponse,
  alt?: string
): CloudinaryImage {
  return {
    publicId: result.public_id,
    url: result.url,
    secureUrl: result.secure_url,
    width: result.width,
    height: result.height,
    alt: alt ?? result.public_id,
    transformations: {
      thumbnail: buildCloudinaryUrl(result.public_id, "thumbnail"),
      card: buildCloudinaryUrl(result.public_id, "card"),
      detail: buildCloudinaryUrl(result.public_id, "detail"),
      zoom: buildCloudinaryUrl(result.public_id, "zoom"),
    },
  };
}

/**
 * Generates a unique public_id so repeated uploads never collide.
 * Format: <timestamp>-<random>  e.g. 1725840827341-4f8a2c
 */
function generateUniquePublicId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  return `${timestamp}-${random}`;
}

export async function uploadBufferToCloudinary(
  buffer: ArrayBuffer,
  filename: string,
  alt?: string,
  folder: CloudinaryFolder = "products"
): Promise<CloudinaryImage> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: CLOUDINARY_FOLDERS[folder],
        public_id: generateUniquePublicId(),
        resource_type: "image",
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed"));
          return;
        }

        resolve(buildCloudinaryImageObject(result, alt ?? filename));
      }
    );

    uploadStream.end(Buffer.from(buffer));
  });
}

// ─── Delete helpers ───────────────────────────────────────────────────────────

/**
 * Deletes a single image from Cloudinary by its public_id.
 * Resolves true on success, false if the asset was not found or deletion failed.
 */
export async function deleteCloudinaryImage(publicId: string): Promise<boolean> {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === "ok" || result.result === "not found";
  } catch {
    return false;
  }
}

/**
 * Deletes multiple images from Cloudinary.
 * Uses Promise.allSettled so a single failure doesn't abort the rest.
 * Returns the list of publicIds that failed to delete.
 */
export async function deleteCloudinaryImages(
  publicIds: string[]
): Promise<{ failed: string[] }> {
  const uniqueIds = [...new Set(publicIds)].filter(Boolean);
  const results = await Promise.allSettled(
    uniqueIds.map((id) => deleteCloudinaryImage(id))
  );

  const failed = uniqueIds.filter(
    (_, i) => results[i].status === "rejected" || results[i].value === false
  );

  return { failed };
}

/**
 * Extracts all Cloudinary publicIds from a mix of values.
 * Accepts:
 *   - a single CloudinaryImage object
 *   - a single string (legacy URL) — skipped
 *   - an array of either
 * Returns a deduplicated array of publicIds.
 */
export function collectPublicIds(
  ...values: Array<
    | string
    | CloudinaryImage
    | Array<string | CloudinaryImage>
    | undefined
    | null
  >
): string[] {
  const ids = new Set<string>();

  for (const value of values) {
    if (!value) continue;

    if (Array.isArray(value)) {
      for (const item of value) {
        collectSingle(item, ids);
      }
    } else {
      collectSingle(value, ids);
    }
  }

  return [...ids];
}

function collectSingle(
  value: string | CloudinaryImage | undefined | null,
  ids: Set<string>
) {
  if (!value) return;
  if (typeof value === "string") return; // legacy URL — no publicId
  if (value.publicId) ids.add(value.publicId);
}