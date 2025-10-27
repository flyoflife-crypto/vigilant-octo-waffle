/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production'

const nextConfig = {
  reactStrictMode: true,
  trailingSlash: true,
  output: undefined, // не используем 'export' для app router
  assetPrefix: isProd ? '' : '',
  images: {
    unoptimized: true
  }
}

module.exports = nextConfig
