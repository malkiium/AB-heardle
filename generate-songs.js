const fs = require("fs");

const files = fs
  .readFileSync("filenames.txt", "utf8")
  .replace(/\u0000/g, "")
  .split(/\r?\n/)
  .map(line => line.trim())
  .filter(line => line.toLowerCase().endsWith(".mp3"));

function cleanTitle(file) {
  return file
    .replace(/\.mp3$/i, "")
    .replace(/^Astro's Playroom OST - /, "")
    .replace(/^SIE Sound Team.*? - /, "")
    .replace(/ - Astro Bot OST \(Official Video Game Soundtrack\)$/i, "")
    .replace(/^(\d+\s*\.\s*)/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function detectGame(file) {
  if (file.startsWith("Astro's Playroom")) return "Astro's Playroom";
  if (file.startsWith("SIE Sound Team")) return "Astro Bot Rescue Mission";
  return "Astro Bot";
}

const songs = files.map(file => ({
  title: cleanTitle(file),
  game: detectGame(file),
  file: `music/${file}`
}));

const output =
  "window.SONGS = " +
  JSON.stringify(songs, null, 2) +
  ";\n";

fs.writeFileSync("songs.js", output, "utf8");

console.log(`Generated ${songs.length} songs.`);