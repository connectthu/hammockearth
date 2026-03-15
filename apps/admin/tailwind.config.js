const baseConfig = require("@hammock/config/tailwind");

/** @type {import('tailwindcss').Config} */
module.exports = {
  ...baseConfig,
  content: ["./src/**/*.{ts,tsx}"],
};
