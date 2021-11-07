const defaultTheme = require('tailwindcss/defaultTheme');

const config = {
	mode: 'jit',
	purge: ['./src/**/*.{html,js,svelte,ts}'],

	theme: {
	  extend: {
            fontFamily: {
              sans: ['Inter var', ...defaultTheme.fontFamily.sans],
            },
          },
	},

	plugins: []
};

module.exports = config;
