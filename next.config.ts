import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3", "@node-rs/argon2"],
  outputFileTracingIncludes: {
    "/**": [
      "./node_modules/better-sqlite3/**/*",
      "./node_modules/@node-rs/argon2/**/*",
      "./node_modules/@node-rs/argon2-*/**/*",
      "./drizzle/**/*",
    ],
  },
};

export default nextConfig;
