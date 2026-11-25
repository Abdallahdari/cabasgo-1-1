/** Idempotent reference-data seed: regions, cities, districts, categories. */
import { run } from "./_bootstrap";
import { CATEGORIES, REGIONS, slugify } from "./seed-data";

run(async () => {
  const { connectDB } = await import("@/server/db/connect");
  const { CategoryModel, CityModel, DistrictModel, RegionModel } = await import("@/server/db/models");
  await connectDB();

  let order = 0;
  for (const region of REGIONS) {
    const r = await RegionModel.findOneAndUpdate(
      { slug: slugify(region.name) },
      { $set: { name: region.name, order: order++, active: true } },
      { upsert: true, returnDocument: "after" },
    );
    for (const city of region.cities) {
      const c = await CityModel.findOneAndUpdate(
        { regionId: r!._id, slug: slugify(city.name) },
        { $set: { name: city.name, active: true } },
        { upsert: true, returnDocument: "after" },
      );
      for (const d of city.districts ?? []) {
        await DistrictModel.updateOne(
          { cityId: c!._id, slug: slugify(d) },
          { $set: { name: d, regionId: r!._id, active: true } },
          { upsert: true },
        );
      }
    }
  }
  for (const [i, cat] of CATEGORIES.entries()) {
    await CategoryModel.updateOne(
      { slug: cat.slug },
      { $set: { ...cat, order: i }, $setOnInsert: { active: true } },
      { upsert: true },
    );
  }
  console.log(
    `Seed complete: ${await RegionModel.countDocuments()} regions, ${await CityModel.countDocuments()} cities, ` +
      `${await DistrictModel.countDocuments()} districts, ${await CategoryModel.countDocuments()} categories.`,
  );
});
