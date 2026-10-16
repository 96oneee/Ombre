import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // OMBRE palette. Change here to re-colour the whole site.
        sand: "#f2f0e4",
        linen: "#e7e3d1",
        lagoon: { DEFAULT: "#227b92", deep: "#1a6478" },
        ink: { DEFAULT: "#10343e", soft: "#3f5c65" },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
