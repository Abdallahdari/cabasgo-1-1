import { Schema, type InferSchemaType } from "mongoose";
import { defineModel, ObjectId } from "./_util";

const slug = { type: String, required: true, trim: true, lowercase: true, match: /^[a-z0-9-]+$/, maxlength: 80 };
const name = { type: String, required: true, trim: true, minlength: 2, maxlength: 80 };

const regionSchema = new Schema(
  {
    name,
    slug,
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);
regionSchema.index({ slug: 1 }, { unique: true });
regionSchema.index({ active: 1, order: 1 });

const citySchema = new Schema(
  {
    name,
    slug,
    regionId: { type: ObjectId, ref: "Region", required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);
citySchema.index({ regionId: 1, slug: 1 }, { unique: true });
citySchema.index({ regionId: 1, name: 1 });

const districtSchema = new Schema(
  {
    name,
    slug,
    cityId: { type: ObjectId, ref: "City", required: true },
    regionId: { type: ObjectId, ref: "Region", required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);
districtSchema.index({ cityId: 1, slug: 1 }, { unique: true });
districtSchema.index({ cityId: 1, name: 1 });

export type RegionDoc = InferSchemaType<typeof regionSchema>;
export type CityDoc = InferSchemaType<typeof citySchema>;
export type DistrictDoc = InferSchemaType<typeof districtSchema>;

export const RegionModel = defineModel<RegionDoc>("Region", regionSchema);
export const CityModel = defineModel<CityDoc>("City", citySchema);
export const DistrictModel = defineModel<DistrictDoc>("District", districtSchema);
