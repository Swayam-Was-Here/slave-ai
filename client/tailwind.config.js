/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Menlo', 'monospace'],
      },
      colors: {
        base: {
          bg:      '#fdfcf8', // Warm off-white cream
          surface: '#ffffff', // Pure white for cards/panels
          border:  '#111111', // Near-black for thick borders
          hover:   '#f4f4f0',
        },
        text: {
          primary:   '#111111', // Near black
          secondary: '#333333',
          muted:     '#666666',
        },
        accent: {
          yellow: '#fde047', // Construction yellow
          red:    '#ef4444', // Strong red
          blue:   '#3b82f6', // Cobalt blue
          green:  '#22c55e', // Strong green
        },
        priority: {
          critical: '#ef4444',
          high:     '#fde047',
          medium:   '#3b82f6',
          low:      '#22c55e',
        },
        status: {
          pending:    '#f4f4f0',
          processing: '#3b82f6',
          completed:  '#22c55e',
          failed:     '#ef4444',
        },
      },
      borderWidth: {
        '3': '3px',
      },
      borderColor: {
        DEFAULT: '#111111',
      },
      boxShadow: {
        'neo': '4px 4px 0px #111111',
        'neo-lg': '6px 6px 0px #111111',
        'neo-active': '0px 0px 0px #111111',
      }
    },
  },
  plugins: [],
};
