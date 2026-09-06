import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Gateway SDKs are CommonJS and must not be bundled into the server build.
  serverExternalPackages: ["razorpay", "stripe"],
  // Pin tracing to this directory so a lockfile further up the tree is ignored.
  outputFileTracingRoot: path.join(import.meta.dirname, "."),
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "paymeify.com" }],
        destination: "https://www.paymeify.com/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "paymeify.vercel.app" }],
        destination: "https://www.paymeify.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
