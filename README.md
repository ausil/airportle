# Airportle

A daily word game where you guess a 3-letter [IATA airport code](https://en.wikipedia.org/wiki/IATA_airport_code) in 6 tries.

Play at **[airportle.club](https://airportle.club)**

## How to play

- Each guess must be a valid 3-letter IATA airport code
- After each guess, tiles reveal how close you were:
  - 🟩 **Green** — correct letter, correct position
  - 🟨 **Yellow** — correct letter, wrong position
  - ⬛ **Gray** — letter not in the code
- A new puzzle is available every day

## Modes

**Filtered** (default) — answers are drawn from ~3,000 airports with scheduled commercial passenger service. Good starting point.

**Original** — answers can be any of 9,000+ IATA codes, including small, remote, and obscure airports. For the dedicated aviation enthusiast.

Both modes reset daily and track separate statistics, so you can play both each day.

## Development

A static single-page app — no build step required.

```
airports.js   Airport data (IATA codes, names, cities, countries)
game.js       Game logic
index.html    UI
style.css     Styles
```

Open `index.html` in a browser or serve the directory with any static file server:

```bash
npx serve .
```
