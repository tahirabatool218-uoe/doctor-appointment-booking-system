import type { Config } from "tailwindcss";

/**
 * Design system: "Medical Blue + Teal".
 * brand = Primary Blue (#2563EB at 600) · accent = Secondary Teal (#0D9488 at 600)
 * navy = Dark Navy (#0F172A) for sidebar/footer · ink = text · mist = page background · tint = light blue surface
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#EFF6FF", 100: "#DBEAFE", 200: "#BFDBFE", 300: "#93C5FD", 400: "#60A5FA",
          500: "#3B82F6", 600: "#2563EB", 700: "#1D4ED8", 800: "#1E40AF", 900: "#1E3A8A",
        },
        accent: {
          50: "#F0FDFA", 100: "#CCFBF1", 200: "#99F6E4", 300: "#5EEAD4", 400: "#2DD4BF",
          500: "#14B8A6", 600: "#0D9488", 700: "#0F766E", 800: "#115E59", 900: "#134E4A",
        },
        navy: { DEFAULT: "#0F172A", 800: "#1E293B", 700: "#273449" },
        ink: { DEFAULT: "#1E293B", soft: "#64748B", mute: "#7A8AA0" },
        mist: "#F8FAFC",
        tint: "#EFF6FF",
      },
      fontFamily: {
        display: ["system-ui", "-apple-system", "'Segoe UI'", "Roboto", "'Helvetica Neue'", "Arial", "sans-serif"],
        sans: ["system-ui", "-apple-system", "'Segoe UI'", "Roboto", "'Helvetica Neue'", "Arial", "sans-serif"],
      },
      boxShadow: {
        panel: "0 1px 2px rgba(15,23,42,.05), 0 8px 24px -14px rgba(15,23,42,.16)",
        lift: "0 2px 4px rgba(15,23,42,.05), 0 16px 32px -16px rgba(37,99,235,.28)",
      },
    },
  },
  plugins: [],
};
export default config;
