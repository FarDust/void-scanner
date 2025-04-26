import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: [
      'www.nasa.gov',
      'esahubble.org',
      'images.unsplash.com', // For potential fallback images
      'localhost', // For local development backend server
    ],
  },
};

export default nextConfig;
