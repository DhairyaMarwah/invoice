/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep unpdf's bundled pdf.js out of the webpack bundle so it runs in Node as-is.
  serverExternalPackages: ['unpdf'],
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
