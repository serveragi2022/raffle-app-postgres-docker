/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Produces a minimal, self-contained server bundle (.next/standalone) —
  // required for the small multi-stage Docker image in this repo.
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb", // allow larger CSV uploads via server actions
    },
  },
};

export default nextConfig;
