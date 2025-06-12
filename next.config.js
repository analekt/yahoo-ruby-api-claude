/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // サーバーサイドコンポーネントはこのプロジェクトでは使用していないため、無効化
  experimental: {
    appDir: false,
  },
  // 本番環境のみの設定
  env: {
    NODE_ENV: process.env.NODE_ENV,
  },
}

module.exports = nextConfig 