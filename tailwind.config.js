/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/client/**/*.{html,js,jsx,ts,tsx}"],
  theme: {
    extend: {},
    fontFamily: {
      noto: ["Noto Sans", "sans-serif"],
    },
  },
  safelist: [
    {
      pattern: /^bg-[a-z]+-\d{3}$/, // Matches bg-<color>-<shade> (e.g., bg-blue-600, bg-red-500)
    },
    {
      pattern: /^hover:bg-[a-z]+-\d{3}$/, // Matches hover:bg-<color>-<shade> (e.g., hover:bg-blue-700)
    },
    {
      pattern: /^focus:ring-[a-z]+-\d{3}$/, // Matches focus:ring-<color>-<shade> (e.g., focus:ring-blue-500)
    },
  ],
  plugins: [],
};
