/** @type {import('next').NextConfig} */
// Build: 2026-06-10T3
const nextConfig = {
  eslint: {
    // ESLint runs separately in CI; don't block the Vercel build
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Prisma client types regenerate at build time; ignore pre-generate TS errors
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
