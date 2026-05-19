import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/",
        headers: [
          {
            key: "Content-Disposition",
            value: 'inline; filename="lennon-lee-hartmann-portfolio.pdf"',
          },
        ],
      },
      {
        source: "/portfolio.pdf",
        headers: [
          {
            key: "Content-Disposition",
            value: 'inline; filename="lennon-lee-hartmann-portfolio.pdf"',
          },
        ],
      },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/",
          destination: "/portfolio.pdf",
        },
      ],
    };
  },
};

export default nextConfig;
