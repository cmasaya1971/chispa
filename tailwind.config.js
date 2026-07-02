/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "wa-header": "#075E54",
        "wa-teal": "#128C7E",
        "wa-brand": "#25D366",
        "wa-bubble-out": "#DCF8C6",
        "wa-bubble-in": "#FFFFFF",
        "wa-chat-bg": "#ECE5DD",
        "wa-tick": "#34B7F1",
        "wa-text": "#111B21",
        "wa-text-2": "#667781",
        "wa-link": "#027EB5",
      },
      fontFamily: {
        wa: ['"Helvetica Neue"', "Helvetica", "Arial", "system-ui", "sans-serif"],
      },
      boxShadow: {
        bubble: "0 1px 0.5px rgba(11,20,26,0.13)",
      },
    },
  },
  plugins: [],
};
