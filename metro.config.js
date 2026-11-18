const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const previous = config.resolver.blockList;
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Server databases, uploads and build caches are outside the mobile asset graph.
config.resolver.blockList = [
  ...(Array.isArray(previous) ? previous : previous ? [previous] : []),
  ...['backend', '.tmp'].map(folder => new RegExp(`${escapeRegex(path.join(__dirname, folder))}[/\\\\]`)),
];

module.exports = config;
