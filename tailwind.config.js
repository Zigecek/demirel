/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/client/**/*.{html,js,jsx,ts,tsx}"],
  theme: {
    extend: {
      backdropBlur: {
        0.5: "0.125rem",
      },
    },
    fontFamily: {
      noto: ["Noto Sans", "sans-serif"],
    },
  },
  plugins: [],
};
