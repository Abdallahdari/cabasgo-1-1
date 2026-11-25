/**
 * Bootstrap the first administrator. This is the ONLY way an ADMIN account
 * is created; the API can never assign the ADMIN role.
 *
 *   npm run admin:create -- --email admin@example.org --name "Magaca"
 *
 * Password: taken from ADMIN_PASSWORD if set, otherwise a strong random
 * password is generated and printed once.
 * An existing account is promoted only with --promote.
 */
import { randomBytes } from "node:crypto";
import { arg, run } from "./_bootstrap";

run(async () => {
  const { connectDB } = await import("@/server/db/connect");
  const { UserModel } = await import("@/server/db/models");
  const { hashPassword } = await import("@/server/auth/password");
  const { password: passwordSchema, emailOnlySchema } = await import("@/lib/validation");

  const email = emailOnlySchema.parse({ email: arg("email") ?? "" }).email;
  const name = arg("name") ?? "Maamule";
  await connectDB();

  const existing = await UserModel.findOne({ email });
  if (existing) {
    if (arg("promote") !== "true") throw new Error(`User ${email} already exists. Re-run with --promote to make them ADMIN.`);
    existing.role = "ADMIN";
    existing.emailVerifiedAt ??= new Date();
    await existing.save();
    console.log(`Promoted ${email} to ADMIN.`);
    return;
  }

  const generated = !process.env.ADMIN_PASSWORD;
  const password = process.env.ADMIN_PASSWORD || `${randomBytes(18).toString("base64url")}9a`;
  // --allow-weak-password skips the strength rule, for local development only.
  const allowWeak = arg("allow-weak-password") === "true" && (process.env.APP_ENV ?? "development") === "development";
  if (arg("allow-weak-password") === "true" && !allowWeak) {
    throw new Error("--allow-weak-password is only allowed when APP_ENV=development.");
  }
  if (allowWeak) {
    if (password.length < 6) throw new Error("Password must be at least 6 characters.");
    console.warn("WARNING: weak admin password accepted (development only).");
  } else {
    passwordSchema.parse(password);
  }
  await UserModel.create({
    name,
    email,
    passwordHash: await hashPassword(password),
    role: "ADMIN",
    emailVerifiedAt: new Date(),
  });
  console.log(`Created ADMIN ${email}.`);
  if (generated) console.log(`Generated password (shown once, store it securely): ${password}`);
});
