import { afterEach, describe, expect, it } from "vitest";
import { getEnv, resetEnvCache } from "@/server/env";

const original = { ...process.env };

afterEach(() => {
  process.env = { ...original };
  resetEnvCache();
});

function withEnv(vars: Record<string, string | undefined>) {
  process.env = { ...original, MONGODB_URI: "mongodb://localhost:27017", ...vars } as NodeJS.ProcessEnv;
  resetEnvCache();
}

describe("environment separation", () => {
  it("allows console email and http in development", () => {
    withEnv({ APP_ENV: "development", EMAIL_TRANSPORT: "console", APP_URL: "http://localhost:3000" });
    expect(getEnv().APP_ENV).toBe("development");
  });

  it("refuses console email in production", () => {
    withEnv({ APP_ENV: "production", EMAIL_TRANSPORT: "console", APP_URL: "https://codka.example.org" });
    expect(() => getEnv()).toThrow(/EMAIL_TRANSPORT/);
  });

  it("requires https, SES sender and S3 bucket in staging/production", () => {
    withEnv({ APP_ENV: "staging", EMAIL_TRANSPORT: "ses", SES_FROM_EMAIL: "a@b.c", S3_BUCKET: "x", APP_URL: "http://insecure.example" });
    expect(() => getEnv()).toThrow(/https/);
    withEnv({ APP_ENV: "production", EMAIL_TRANSPORT: "ses", APP_URL: "https://codka.example.org", S3_BUCKET: "x", SES_FROM_EMAIL: "" });
    expect(() => getEnv()).toThrow(/SES_FROM_EMAIL/);
    withEnv({ APP_ENV: "production", EMAIL_TRANSPORT: "ses", APP_URL: "https://codka.example.org", S3_BUCKET: "x", SES_FROM_EMAIL: "a@b.c" });
    expect(getEnv().APP_ENV).toBe("production");
  });

  it("requires a MongoDB connection string", () => {
    withEnv({ MONGODB_URI: "" });
    expect(() => getEnv()).toThrow(/MONGODB_URI/);
  });
});
