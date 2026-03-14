/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "../../apps/*/app/**/*.{ts,tsx}",
    "../../apps/*/components/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        soil: "#3B2F2F",
        clay: "#C4845A",
        linen: "#F5EFE6",
        moss: "#6B7C5C",
        cream: "#FBF7F0",
        charcoal: "#4A4A4A",
      },
      fontFamily: {
        serif: ["Lora", "Playfair Display", "Georgia", "serif"],
        sans: ["DM Sans", "Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

module.exports = config;
