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
          bg:      '#0A0A0A',
          surface: '#111111',
          border:  '#1F1F1F',
          hover:   '#161616',
        },
        // Text
        text: {
          primary:   '#F2F2F2',
          secondary: '#888888',
          muted:     '#444444',
        },
        // Priority
        priority: {
          critical: '#EF4444',
          high:     '#F97316',
          medium:   '#EAB308',
          low:      '#6B7280',
        },
        // Status
        status: {
          pending:    '#6B7280',
          processing: '#3B82F6',
          completed:  '#22C55E',
          failed:     '#EF4444',
        },
      },
      borderColor: {
        DEFAULT: '#1F1F1F',
      },
    },
  },
  plugins: [],
};
