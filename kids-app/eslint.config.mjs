import expoConfig from 'eslint-config-expo/flat.js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

export default [
  ...expoConfig,
  eslintPluginPrettierRecommended,
  {
    ignores: ['node_modules/', '.expo/', 'dist/', 'babel.config.js'],
  },
];
