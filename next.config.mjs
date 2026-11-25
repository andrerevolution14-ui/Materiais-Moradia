/** @type {import('next').NextConfig} */
export default {
  poweredByHeader: false,
  devIndicators: false,
  images: { unoptimized: true },
  turbopack: { root: process.cwd() },
};
