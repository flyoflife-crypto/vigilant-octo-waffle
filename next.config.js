/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  reactStrictMode: true,
  images: { unoptimized: true },
  // assetPrefix: "./"  // ⚠️ НЕЛЬЗЯ для next/font (geist). Оставляем убранным.
};
module.exports = nextConfig;
