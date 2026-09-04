import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The Razorpay SDK is CommonJS and must not be bundled into the server build.
  serverExternalPackages: ["razorpay"],
  // Pin tracing to this directory so a lockfile further up the tree is ignored.
  outputFileTracingRoot: path.join(import.meta.dirname, "."),
};

export default nextConfig;
