import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Gateway SDKs are CommonJS and must not be bundled into the server build.
  serverExternalPackages: ["razorpay", "stripe"],
  // Pin tracing to this directory so a lockfile further up the tree is ignored.
  outputFileTracingRoot: path.join(import.meta.dirname, "."),
};

export default nextConfig;
