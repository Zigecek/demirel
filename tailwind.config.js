/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/client/**/*.{html,js,jsx,ts,tsx}"],
  theme: {
    extend: {
      backdropBlur: {
        "2px": "2px",
      },
    },
    fontFamily: {
      noto: ["Noto Sans", "sans-serif"],
    },
  },
  plugins: [],
};
