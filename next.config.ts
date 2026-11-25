import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page in this app depends on the per-request session or on live
  // MongoDB data, so we use the request-time rendering model instead of
  // Cache Components.
  cacheComponents: false,
  // Produces .next/standalone for a small production Docker image.
  output: "standalone",
  poweredByHeader: false,
  // Native / Node-only modules that must not be bundled.
  serverExternalPackages: ["@node-rs/argon2", "mongoose", "mongodb"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
