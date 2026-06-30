const config = {
  darkMode: ["class"],
  content: ["./src/app/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ['"DM Sans"', "system-ui", "sans-serif"] },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        border: "hsl(var(--border))", input: "hsl(var(--input))", ring: "hsl(var(--ring))",
        lapis: {
          50: "#EFF6FC", 100: "#CEE1F2", 200: "#A5C8E8", 300: "#71A8D9",
          400: "#4A8AC9", 500: "#26619C", 600: "#1F4E7E", 700: "#183B5F",
          800: "#112840", 900: "#0A1521",
        },
        ink: {
          900: "#1A1A2E", 800: "#2D2D44", 700: "#3D3D54", 600: "#4E4E64",
          500: "#6B6B82", 400: "#8E8EA3", 300: "#B0B0C0", 200: "#D0D0DC",
          100: "#E8E8F0", 50: "#F5F5FA",
        },
        charcoal: {
          50: "#f8f8fa", 100: "#f0f0f3", 200: "#e2e2e8", 300: "#c8c8d0",
          400: "#a8a8b5", 500: "#888898", 600: "#686878", 700: "#484858",
          800: "#2d2d38", 900: "#1a1a22",
        },
        coral: {
          300: "#FFA07A", 400: "#F58549", 500: "#E36A34", 600: "#C65424",
          700: "#A0431A",
        },
      },
      borderRadius: { lg: "var(--radius)" },
      boxShadow: {
        "glow-lapis": "0 0 20px rgba(38,97,156,0.15)",
        "glow-coral": "0 0 20px rgba(227,106,52,0.12)",
        "card": "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)",
        "card-hover": "0 4px 12px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04)",
      },
      keyframes: {
        fadeIn:    { "0%": { opacity:"0", transform:"translateY(6px)" }, "100%": { opacity:"1", transform:"translateY(0)" } },
        pulseSoft: { "0%,100%": { opacity:"1" }, "50%": { opacity:"0.55" } },
      },
      animation: { fadeIn: "fadeIn 0.25s ease-out", pulseSoft: "pulseSoft 1.6s ease-in-out infinite" },
    },
  },
  plugins: [],
};
export default config;
