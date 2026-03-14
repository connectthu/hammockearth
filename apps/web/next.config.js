/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@hammock/ui", "@hammock/database"],
  images: {
    domains: ["hammock.earth"],
  },
};

module.exports = nextConfig;
