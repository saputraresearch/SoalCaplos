import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        caplos: {
          blue: {
            DEFAULT: "#1976D2",
            50: "#E3F2FD",
            100: "#BBDEFB",
            200: "#90CAF9",
            300: "#64B5F6",
            400: "#42A5F5",
            500: "#1976D2",
            600: "#1565C0",
            700: "#0D47A1",
          },
          yellow: {
            DEFAULT: "#FFC229",
            50: "#FFFDE7",
            100: "#FFF9C4",
            200: "#FFF59D",
            300: "#FFF176",
            400: "#FFEE58",
            500: "#FFC229",
            600: "#F5B01D",
            700: "#D9950F",
          },
          navy: {
            DEFAULT: "#102A43",
            50: "#F0F4F8",
            100: "#D9E2EC",
            200: "#BCCCDC",
            300: "#9FB3C8",
            400: "#829AB1",
            500: "#627D98",
            600: "#486581",
            700: "#334E68",
            800: "#243B53",
            900: "#102A43",
          },
        },
      },
    },
  },
  plugins: [],
};
export default config;
