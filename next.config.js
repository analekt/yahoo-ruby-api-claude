/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // 本番環境のみの設定があれば、NODE_ENV以外の環境変数をここに追加
  env: {
    // NODE_ENV は Next.js が自動的に設定するため、ここで設定する必要はありません
  },
}

module.exports = nextConfig 