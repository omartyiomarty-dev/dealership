import type { NextConfig } from "next";

/**
 * Security + performance headers applied to every response.
 * Keeping them here (instead of in middleware) means they are emitted as static
 * headers — cheap, and they also cover statically cached assets.
 */
const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" }, // clickjacking protection (allows own map embed)
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  // Fail the build on obvious problems instead of deploying a broken site.
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // NOTE: successful image responses set their own long cache headers in the
      // route handler. 404s are NOT cached here, so an image added later is
      // served immediately instead of being pinned as missing for a year.
      // Never let a proxy cache admin or API responses
      { source: "/admin/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }] },
      { source: "/api/admin/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }] },
    ];
  },
};

export default nextConfig;
