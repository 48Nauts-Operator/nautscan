/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // We're using standalone mode for Docker deployment
  output: 'standalone',
  // Configure images to allow domains
  images: {
    domains: ['localhost'],
  },
  // Disable experimental CSS optimizations to avoid critters dependency issues
  experimental: {
    optimizeCss: false,
  },
};

module.exports = nextConfig; 