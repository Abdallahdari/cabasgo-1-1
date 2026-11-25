import { Schema, type InferSchemaType } from "mongoose";
import { CATEGORY_ICONS } from "@/lib/constants";
import { defineModel } from "./_util";


const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    slug: { type: String, required: true, trim: true, lowercase: true, match: /^[a-z0-9-]+$/, maxlength: 60 },
    description: { type: String, trim: true, maxlength: 300, default: "" },
    icon: { type: String, enum: CATEGORY_ICONS, default: "circle-help" },
    color: { type: String, match: /^#[0-9a-fA-F]{6}$/, default: "#2F6FED" },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);
categorySchema.index({ slug: 1 }, { unique: true });
categorySchema.index({ active: 1, order: 1 });

export type CategoryDoc = InferSchemaType<typeof categorySchema>;
export const CategoryModel = defineModel<CategoryDoc>("Category", categorySchema);
