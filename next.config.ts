import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.nasa.gov',
      },
      {
        protocol: 'https',
        hostname: 'science.nasa.gov',
      },
      {
        protocol: 'https',
        hostname: 'cdn.esahubble.org',
      },
      {
        protocol: 'https',
        hostname: 'esahubble.org',
      },
      {
        protocol: 'https',
        hostname: 'cdn.eso.org',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com', // For potential fallback images
      },
      {
        protocol: 'http',
        hostname: 'localhost', // For local development backend server
      },
    ],
  },
};

export default nextConfig;
