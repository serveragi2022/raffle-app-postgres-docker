/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,

  // Allow access from local network IP
  allowedDevOrigins: ["192.168.101.235"],

  // Produces a minimal, self-contained server bundle (.next/standalone)
  // required for the small multi-stage Docker image in this repo.
  output: "standalone",

  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;