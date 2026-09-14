import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.FOCUSBASE_DESKTOP === '1' ? {output:'export' as const} : {}),
};

export default nextConfig;
