/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',               // генерируем статический out/
  reactStrictMode: true,
  images: { unoptimized: true },  // для статической сборки
  // НИЧЕГО не трогаем с assetPrefix для geist/font,
  // иначе словим ошибку "assetPrefix must start with / or http"
};

module.exports = nextConfig;
