module.exports = {
  extends: ['expo', 'prettier'],
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': [
      'error',
      {
        endOfLine: 'auto',
      },
    ],
    'no-console': 'warn',
    'no-debugger': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
  },

  env: {
    es6: true,
    node: true,
    jest: true,
  },

  // Ignore patterns
  ignorePatterns: [
    'node_modules/',
    'coverage/',
    'build/',
    '.expo/',
    'web-build/',
    '*.config.js',
  ],
};
