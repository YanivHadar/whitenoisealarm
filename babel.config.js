module.exports = function (api) {
  api.cache(true);
  
  return {
    presets: [
      'babel-preset-expo'
    ],
    plugins: [
      // Performance optimizations - root imports for cleaner imports
      [
        'babel-plugin-root-import',
        {
          rootPathPrefix: '~/',
          rootPathSuffix: 'src',
        },
      ],
      
      // Inline environment variables
      [
        'babel-plugin-inline-dotenv',
        {
          path: '.env',
        },
      ],
    ],
    env: {
      production: {
        plugins: [
          // Remove console logs in production (keep error and warn)
          [
            'babel-plugin-transform-remove-console',
            {
              exclude: ['error', 'warn'],
            },
          ],
          // Remove debugger statements
          'babel-plugin-transform-remove-debugger',
          // Remove undefined expressions for smaller bundle
          'babel-plugin-transform-remove-undefined',
        ],
      },
    },
  };
};