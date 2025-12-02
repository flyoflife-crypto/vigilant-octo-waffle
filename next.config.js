/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Use repository name as basePath for GitHub Pages
  basePath: process.env.NODE_ENV === 'production' ? '/vigilant-octo-waffle-SP' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/vigilant-octo-waffle-SP' : '',
}

module.exports = nextConfig
