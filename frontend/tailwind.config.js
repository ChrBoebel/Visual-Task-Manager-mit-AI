/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Claude-inspired dark mode colors
        background: 'oklch(0.27 0.00 106.64)',
        foreground: 'oklch(0.81 0.01 93.01)',
        primary: {
          DEFAULT: '#4A9B6B',
          hover: '#3D8258',
        },
        secondary: 'oklch(0.98 0.01 95.10)',
        muted: {
          DEFAULT: 'oklch(0.22 0.00 106.71)',
          foreground: 'oklch(0.81 0.01 93.01)',
        },
        accent: {
          DEFAULT: 'oklch(0.21 0.01 95.42)',
          foreground: 'oklch(0.98 0.01 95.10)',
        },
        border: 'oklch(0.22 0.00 106.71)',
      },
      borderRadius: {
        lg: '12px',
        md: '8px',
        sm: '4px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
