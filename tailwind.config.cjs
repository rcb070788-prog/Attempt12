const path = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    path.join(__dirname, 'index.html'),
    path.join(__dirname, 'App.tsx'),
    path.join(__dirname, 'index.tsx'),
    path.join(__dirname, 'components', '**', '*.{js,ts,jsx,tsx}'),
    path.join(__dirname, 'hooks', '**', '*.{js,ts,jsx,tsx}'),
    path.join(__dirname, 'utils', '**', '*.{js,ts,jsx,tsx}'),
    path.join(__dirname, 'lib', '**', '*.{js,ts,jsx,tsx}'),
    path.join(__dirname, 'src', '**', '*.{js,ts,jsx,tsx}'),
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  // Body classes from index.html; category icon colors from constants.ts (dynamic in CategoryLinks)
  safelist: [
    'bg-slate-50',
    'text-slate-900',
    'bg-red-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-blue-500',
  ],
};
