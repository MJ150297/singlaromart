import mongoose, { Schema, model, models } from "mongoose";

// ─── User schema ──────────────────────────────────────────────────────────────
const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["owner", "customer"],
      default: "customer",
      index: true,
    },
    // Incremented on password change to invalidate existing JWT sessions
    tokenVersion: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc: unknown, ret: Record<string, unknown>) => {
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        return ret;
      },
    },
  }
);

export const User = models.User || model("User", UserSchema);

export type UserDocument = mongoose.InferSchemaType<typeof UserSchema>;