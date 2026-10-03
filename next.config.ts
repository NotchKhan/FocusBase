import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.FOCUSBASE_DESKTOP === '1' ? {output:'export' as const} : {}),
  ...(process.env.FOCUSBASE_DESKTOP === '1' ? {} : {async headers(){return [{source:'/sw.js',headers:[
    {key:'Content-Type',value:'application/javascript; charset=utf-8'},
    {key:'Cache-Control',value:'no-cache, no-store, must-revalidate'},
    {key:'Content-Security-Policy',value:"default-src 'self'; script-src 'self'"},
  ]},{source:'/(.*)',headers:[
    {key:'X-Content-Type-Options',value:'nosniff'},
    {key:'X-Frame-Options',value:'DENY'},
    {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
    {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'},
    {key:'Content-Security-Policy',value:"object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"},
  ]}]}}),
};

export default nextConfig;
