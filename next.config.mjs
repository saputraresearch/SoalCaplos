/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['pdf-img-convert', 'sharp', 'pdfjs-dist', 'pdf-parse'],
  },
};

export default nextConfig;
