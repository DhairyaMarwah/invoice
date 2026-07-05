/** @type {import('next').NextConfig} */
const nextConfig = {
  // Self-contained server bundle for Docker/Railway (`.next/standalone/server.js`).
  output: 'standalone',
  // Keep unpdf's bundled pdf.js out of the webpack bundle so it runs in Node as-is.
  serverExternalPackages: ['unpdf', '@libsql/client', '@libsql/isomorphic-ws'],
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
