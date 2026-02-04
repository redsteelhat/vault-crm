/** @type {import('tailwindcss').Config} */
// VaultLink Design System — 8pt grid, platform tuning (Windows/macOS), semantic tokens
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      // FND / Type — Inter + system fallbacks (Platform Tuning 4.1)
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "IBM Plex Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      // FND / Type — Scale (H1..Caption); line-height per platform in globals
      fontSize: {
        "display": ["2.5rem", { lineHeight: "1.2", fontWeight: "700" }],
        "h1": ["2rem", { lineHeight: "1.25", fontWeight: "700" }],
        "h2": ["1.5rem", { lineHeight: "1.3", fontWeight: "600" }],
        "h3": ["1.25rem", { lineHeight: "1.35", fontWeight: "600" }],
        "h4": ["1.125rem", { lineHeight: "1.4", fontWeight: "600" }],
        "body-lg": ["1rem", { lineHeight: "1.5" }],
        "body": ["0.875rem", { lineHeight: "1.5" }],
        "body-sm": ["0.8125rem", { lineHeight: "1.45" }],
        "caption": ["0.75rem", { lineHeight: "1.4" }],
      },
      // FND / Grid — 8pt base (Tailwind 4 = 1 unit; 2 = 8px)
      spacing: {
        "18": "4.5rem",   // 72px
        "22": "5.5rem",   // 88px
      },
      // Component heights (desktop standard: md 44px, sm 36px, lg 52px)
      height: {
        "touch-md": "44px",
        "touch-sm": "36px",
        "touch-lg": "52px",
      },
      minHeight: {
        "touch-md": "44px",
        "touch-sm": "36px",
        "touch-lg": "52px",
      },
      // FND / Radius — 4 seviye
      borderRadius: {
        "ds-sm": "4px",
        "ds-md": "6px",
        "ds-lg": "8px",
        "ds-xl": "12px",
      },
      // Colors: semantic + existing
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: "hsl(var(--destructive))",
        // FND / Color / Semantic
        success: "hsl(var(--success))",
        warn: "hsl(var(--warn))",
        error: "hsl(var(--error))",
        info: "hsl(var(--info))",
      },
      boxShadow: {
        "ds-sm": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        "ds-md": "0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)",
        "ds-lg": "0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.05)",
      },
      // Focus ring — Accessibility (P0)
      ringWidth: {
        "focus": "2px",
      },
    },
  },
  plugins: [],
};
