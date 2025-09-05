const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configure asset extensions for audio files
config.resolver.assetExts.push(
  // Audio formats
  'mp3',
  'wav',
  'aac',
  'm4a',
  'ogg',
  'flac'
);

module.exports = config;