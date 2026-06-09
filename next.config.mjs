/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // ESLint runs separately in CI; don't block the Vercel build
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
