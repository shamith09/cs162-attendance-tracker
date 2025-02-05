/** @type {import('next').NextConfig} */
const nextConfig = {
  // Config options here
};

const withVercelToolbar = require('@vercel/toolbar/plugins/next')();

module.exports = withVercelToolbar(nextConfig); 