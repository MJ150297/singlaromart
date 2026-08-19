export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "/api",
  mongodbUri: process.env.MONGODB_URI || "mongodb://localhost:27017/indiyano",
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "",
  },
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "919876543210",
};
