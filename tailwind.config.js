module.exports = {
  purge: [
    './layouts/**/*.html',
  ],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            'code::before': {
              content: "",
            },
            'code::after': {
              content: "",
            },
            'pre': {
              color: 'unset',
            }
          },
        },
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
