/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#047857", // emerald-700
          dark: "#064e3b",    // emerald-900
        },
        accent: "#14b8a6",    // teal-500
        bg: {
          dark: "#0a0f0d",
          card: "#111817",
          light: "#f8fafc",
        },
        success: "#10b981",   // emerald-500
        warning: "#f59e0b",   // amber-500
        danger: "#f43f5e",    // rose-500
        info: "#0ea5e9",      // sky-500
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'sans-serif'],
        heading: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'Space Grotesk', 'monospace'],
        arabic: ['Cairo', 'IBM Plex Sans Arabic', 'sans-serif'],
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
      },
    },
  },
  plugins: [],
}
