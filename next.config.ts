import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // A kliens szerkesztő beágyazható GHL iframe-be
        source: "/edit/:path*",
        headers: [
          {
            // Engedélyezett GHL domainek iframe-ként
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' https://app.gohighlevel.com https://app.leadconnectorhq.com https://*.gohighlevel.com https://*.leadconnectorhq.com",
          },
          // X-Frame-Options-t felülírja a CSP frame-ancestors, de explicit töröljük
          {
            key: "X-Frame-Options",
            value: "ALLOWALL",
          },
        ],
      },
      {
        // GHL auth redirect route is also embeddable
        source: "/api/ghl/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' https://app.gohighlevel.com https://app.leadconnectorhq.com https://*.gohighlevel.com https://*.leadconnectorhq.com",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
