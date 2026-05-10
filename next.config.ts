import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    '@llamaindex/liteparse',
    '@hyzyla/pdfium',
    'sharp',
    'tesseract.js',
  ],
};

export default nextConfig;
