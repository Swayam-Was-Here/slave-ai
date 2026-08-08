/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      colors: {
        // Base surfaces
        base: {
          bg:      '#09090b', // Zinc 950
          surface: '#121214', // Slightly lighter
          elevated:'#18181b', // Zinc 900
          border:  '#27272a', // Zinc 800
          hover:   '#1f1f22',
        },
        // Text
        text: {
          primary:   '#f4f4f5', // Zinc 50
          secondary: '#a1a1aa', // Zinc 400
          muted:     '#52525b', // Zinc 600
        },
        // Priority
        priority: {
          critical: '#ef4444',
          high:     '#f97316',
          medium:   '#eab308',
          low:      '#71717a',
        },
        // Status
        status: {
          pending:    '#71717a',
          processing: '#3b82f6',
          completed:  '#22c55e',
          failed:     '#ef4444',
        },
      },
      borderColor: {
        DEFAULT: '#27272a',
      },
    },
  },
  plugins: [],
};
