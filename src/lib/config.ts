export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "/api",
  mongodbUri: process.env.MONGODB_URI || "mongodb://localhost:27017/indiyano",
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "",
  },
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "919876543210",
  push: {
    // NEXT_PUBLIC_VAPID_PUBLIC_KEY is the documented name. Keep the older
    // server-only name as a fallback for existing deployments.
    publicKey:
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || "",
    privateKey: process.env.VAPID_PRIVATE_KEY || "",
    subject: process.env.VAPID_SUBJECT || "mailto:admin@indiyano.food",
  },
};
