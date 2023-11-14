/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./components/**/*.tsx', './pages/**/*.tsx'],
  theme: {
    extend: {
      colors: {
        black: '#171c28',
        gray1: '#171c28',
        gray2: '#2f3b54',
        gray3: '#6679a4',
        gray4: '#8695b7',
        offWhite: '#a2aabc',
        white: '#d7dce2',
        gold: '#ffcc66',
        blue: '#5ccfe6',
        green: '#bae67e',
        orange: '#ffae57',
        yellow: '#ffd580',
        purple: '#c3a6ff',
        red: '#ef6b73'
      },
      spacing: {
        28: '7rem',
      },
      letterSpacing: {
        tighter: '-.04em',
      },
      lineHeight: {
        tight: 1.2,
      },
      fontSize: {
        '5xl': '2.5rem',
        '6xl': '2.75rem',
        '7xl': '4.5rem',
        '8xl': '6.25rem',
      },
      boxShadow: {
        sm: '0 5px 10px rgba(0, 0, 0, 0.12)',
        md: '0 8px 30px rgba(0, 0, 0, 0.12)',
      },
    },
  },
  plugins: [],
}
