#!/usr/bin/env node
import { build } from '../lib/build.mjs';
const [command, file, ...options] = process.argv.slice(2);
try {
  if (command !== 'build' || !file) {
    console.log('Usage: slides-kit build <deck.json> [-o <deck.html>]');
    process.exitCode = command === '--help' || !command ? 0 : 1;
  } else {
    if (options.length && (options.length !== 2 || options[0] !== '-o' || !options[1])) throw new Error('Expected -o <deck.html>');
    const result = await build(file, options[1]);
    console.log(`${result.slides} slides → ${result.path}`);
  }
} catch (error) { console.error(`slides-kit: ${error.message}`); process.exitCode = 1; }
