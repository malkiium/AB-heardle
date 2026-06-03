ASTROBOT HEARDLE - EASY DEBUG VERSION

HOW TO TEST LOCALLY
1. Open index.html directly.
2. No Python server is needed anymore.

HOW TO ADD SONGS
1. Put audio files in the music folder.
2. Open songs.js.
3. Add entries like this:

window.SONGS = [
  {
    title: "astronomical",
    game: "Astro Bot",
    file: "music/astronomical.mp3"
  },
  {
    title: "Another Song",
    game: "Astro Bot",
    file: "music/another-song.mp3"
  }
];

IMPORTANT
- Use mp3, ogg, wav, m4a, or aac.
- brstm does not work in browsers. Convert it first.
- File names must match exactly, including spaces and capital letters.
- Every song except the last one needs a comma after its closing }.

GITHUB PAGES
1. Upload index.html, style.css, script.js, songs.js, songs.json, assets/, and music/ to your repository.
2. Enable GitHub Pages.
3. The site should work.

NOTES
- The game reads songs.js first because that works when double-clicking index.html.
- songs.json is kept as an optional backup/reference.
