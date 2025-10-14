export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],

  darkMode: "class",

  safelist: [
    "dark",
    {
      pattern: /dark:/,
    },
  ],

  theme: {
    extend: {},
  },

  plugins: [],
};
