/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@echrimheni/shared', '@echrimheni/database'],
  // P6.9-G — pdfkit@0.20.2 utilise des subpath imports Node (`#standard-fonts/*`)
  // non résolvables dans le bundle serveur. Le garder externe : require natif
  // Node au runtime (dev + build + start).
  serverExternalPackages: ['pdfkit'],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
