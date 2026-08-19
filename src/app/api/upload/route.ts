import { NextResponse } from "next/server";
import { uploadBufferToCloudinary, CLOUDINARY_FOLDERS, type CloudinaryFolder } from "@/lib/cloudinary";
import { requireOwner } from "@/lib/auth/guard";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { getErrorMessage } from "@/lib/errors";

const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5MB

// Rate limits: 20 uploads/minute and 200 uploads/hour per IP
const RATE_LIMIT_PER_MINUTE = 20;
const RATE_LIMIT_PER_HOUR = 200;

export async function POST(request: Request) {
  // 1. Auth guard — only owner role can upload
  const { error } = await requireOwner();
  if (error) return error;

  // 2. Rate limiting — per IP, per minute and per hour
  const ip = getClientIp(request);
  const minuteLimited = await checkRateLimit({
    key: "upload-minute",
    identifier: ip,
    limit: RATE_LIMIT_PER_MINUTE,
    windowMs: 60 * 1000,
  });
  if (minuteLimited) {
    return NextResponse.json({ success: false, error: minuteLimited }, { status: 429 });
  }

  const hourLimited = await checkRateLimit({
    key: "upload-hour",
    identifier: ip,
    limit: RATE_LIMIT_PER_HOUR,
    windowMs: 60 * 60 * 1000,
  });
  if (hourLimited) {
    return NextResponse.json({ success: false, error: hourLimited }, { status: 429 });
  }

  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { success: false, error: "Request must be multipart/form-data." },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const alt = formData.get("alt")?.toString();
    const folder = (formData.get("folder")?.toString() || "products") as CloudinaryFolder;

    // Validate folder against the allowlist to prevent arbitrary path injection
    if (!(folder in CLOUDINARY_FOLDERS)) {
      return NextResponse.json(
        { success: false, error: `Invalid folder. Allowed folders: ${Object.keys(CLOUDINARY_FOLDERS).join(", ")}` },
        { status: 400 }
      );
    }

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { success: false, error: "File field is required." },
        { status: 400 }
      );
    }

    const filename = file.name || "upload";
    const fileType = file.type;
    const fileSize = file.size;

    if (!SUPPORTED_IMAGE_TYPES.includes(fileType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported file type. Allowed types: ${SUPPORTED_IMAGE_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    if (fileSize > MAX_UPLOAD_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `File too large. Maximum allowed size is ${MAX_UPLOAD_SIZE / 1024 / 1024}MB.`,
        },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const image = await uploadBufferToCloudinary(buffer, filename, alt, folder);

    return NextResponse.json({ success: true, data: image }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(error) || "Upload failed." },
      { status: 500 }
    );
  }
}
