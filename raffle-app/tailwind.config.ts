import type { Config } from "tailwindcss";

// Design tokens sourced from the Google Stitch "Executive Alpha" design system.
// See: stitch_food_safety_raffle_pro/executive_alpha/DESIGN.md
const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "24px",
      screens: { "2xl": "1440px" },
    },
    extend: {
      colors: {
        surface: {
          DEFAULT: "#f8f9ff",
          dim: "#cbdbf5",
          bright: "#f8f9ff",
          "container-lowest": "#ffffff",
          "container-low": "#eff4ff",
          container: "#e5eeff",
          "container-high": "#dce9ff",
          "container-highest": "#d3e4fe",
          variant: "#d3e4fe",
        },
        "on-surface": "#0b1c30",
        "on-surface-variant": "#444651",
        "inverse-surface": "#213145",
        "inverse-on-surface": "#eaf1ff",
        outline: {
          DEFAULT: "#757682",
          variant: "#c5c5d3",
        },
        primary: {
          DEFAULT: "#00236f",
          container: "#1e3a8a",
          fixed: "#dce1ff",
          "fixed-dim": "#b6c4ff",
        },
        "on-primary": "#ffffff",
        "on-primary-container": "#90a8ff",
        "inverse-primary": "#b6c4ff",
        secondary: {
          DEFAULT: "#006c49",
          container: "#6cf8bb",
          fixed: "#6ffbbe",
          "fixed-dim": "#4edea3",
        },
        "on-secondary": "#ffffff",
        "on-secondary-container": "#00714d",
        tertiary: {
          DEFAULT: "#3e2400",
          container: "#5c3800",
          fixed: "#ffddb8",
          "fixed-dim": "#ffb95f",
        },
        "on-tertiary": "#ffffff",
        "on-tertiary-container": "#ef9900",
        error: {
          DEFAULT: "#ba1a1a",
          container: "#ffdad6",
        },
        "on-error": "#ffffff",
        "on-error-container": "#93000a",
        background: "#f8f9ff",
        "on-background": "#0b1c30",
        gold: "#f59e0b",
      },
      fontFamily: {
        sans: ["var(--font-montserrat)", "Montserrat", "sans-serif"],
      },
      fontSize: {
        "display-lg": ["48px", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-lg": ["32px", { lineHeight: "1.2", letterSpacing: "-0.01em", fontWeight: "700" }],
        "headline-lg-mobile": ["28px", { lineHeight: "1.2", fontWeight: "700" }],
        "headline-md": ["24px", { lineHeight: "1.3", fontWeight: "600" }],
        "title-lg": ["20px", { lineHeight: "1.4", fontWeight: "600" }],
        "body-lg": ["16px", { lineHeight: "1.6", fontWeight: "400" }],
        "body-md": ["14px", { lineHeight: "1.5", fontWeight: "400" }],
        "label-md": ["12px", { lineHeight: "1.2", letterSpacing: "0.05em", fontWeight: "600" }],
      },
      borderRadius: {
        sm: "0.125rem",
        DEFAULT: "0.25rem",
        md: "0.375rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px",
      },
      spacing: {
        gutter: "24px",
        "margin-desktop": "40px",
        "margin-mobile": "16px",
      },
      maxWidth: {
        "container-max": "1440px",
      },
      boxShadow: {
        ambient: "0 8px 24px -4px rgb(0 0 0 / 0.04)",
      },
      backdropBlur: {
        glass: "20px",
      },
      keyframes: {
        "roulette-spin": {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(-100%)" },
        },
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 rgb(0 35 111 / 0.4)" },
          "100%": { boxShadow: "0 0 0 16px rgb(0 35 111 / 0)" },
        },
      },
      animation: {
        "pulse-ring": "pulse-ring 1.5s cubic-bezier(0.4,0,0.6,1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
