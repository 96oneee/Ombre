import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // OMBRE · The Art of Shade. Change here to re-colour the whole site.
        sand: "#F2EDE3",
        shell: "#FAF8F3",
        dune: "#E3DBCB",
        wood: { DEFAULT: "#A8743A", light: "#C8955A" },
        sea: { DEFAULT: "#0E3A48", deep: "#0A2C37" },
        charcoal: "#1F2325",
        mist: "#6B7375",
        // older names used by the shop, cart and admin pages
        linen: "#E3DBCB",
        lagoon: { DEFAULT: "#0E3A48", deep: "#0A2C37" },
        ink: { DEFAULT: "#1F2325", soft: "#5E6669" },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      letterSpacing: { label: "0.22em" },
      transitionTimingFunction: { shade: "cubic-bezier(0.22, 1, 0.36, 1)" },
    },
  },
  plugins: [],
};

export default config;
