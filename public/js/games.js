// Spiele-Katalog. Neues Spiel: Eintrag hier ergänzen, Modul unter /games/<id>.js anlegen
// und eine passende Kachel-Illustration in art.js hinzufügen.
// Das Modul exportiert `mount(container, api)` und gibt eine Cleanup-Funktion zurück.
//
// theme: bg = Kachelfarbe, edge = dicker Rand unten, ink = Textfarbe auf der Kachel

export const CATEGORIES = ['Klassiker', 'Geschick', 'Puzzle', 'Action', 'Multiplayer'];

export const GAMES = [
  {
    id: 'snake',
    title: 'Snake',
    categories: ['Klassiker', 'Geschick'],
    teaser: 'Friss dich durchs Spielfeld und werde immer länger – aber beiß dir nicht in den Schwanz.',
    description: 'Steuere die Schlange, friss das Futter und werde immer länger – aber beiß dir nicht in den Schwanz!',
    controls: 'Pfeiltasten oder WASD zum Lenken, Leertaste für Pause. Auf dem Handy: wischen oder die Pfeil-Buttons nutzen.',
    theme: { bg: '#aad751', edge: '#4a752c', ink: '#1e3a0f' },
    badge: 'NEU',
    featured: true,
    available: true,
  },
  {
    id: '2048',
    title: '2048',
    categories: ['Puzzle'],
    teaser: 'Schiebe gleiche Zahlen zusammen, bis du die 2048 erreichst.',
    description: 'Schiebe alle Kacheln in eine Richtung. Zwei gleiche Zahlen verschmelzen zu ihrer Summe. Schaffst du die 2048-Kachel, bevor das Feld voll ist?',
    controls: 'Pfeiltasten oder WASD zum Schieben. Auf dem Handy: wischen. Dein Spielstand wird automatisch gespeichert.',
    theme: { bg: '#ffd43b', edge: '#f08c00', ink: '#5c3c00' },
    badge: 'NEU',
    featured: true,
    available: true,
  },
  {
    id: 'connect4',
    title: 'Vier gewinnt',
    categories: ['Multiplayer', 'Klassiker'],
    teaser: 'Vier Steine in eine Reihe – gegen Freunde oder den Computer.',
    theme: { bg: '#24477d', edge: '#14294a', ink: '#ffffff' },
    featured: true,
    available: false,
  },
  {
    id: 'memory',
    title: 'Memory',
    categories: ['Puzzle', 'Klassiker'],
    theme: { bg: '#74c0fc', edge: '#1c7ed6', ink: '#0b2a4a' },
    available: false,
  },
  {
    id: 'minesweeper',
    title: 'Minesweeper',
    categories: ['Puzzle', 'Klassiker'],
    theme: { bg: '#dee2e6', edge: '#868e96', ink: '#212529' },
    available: false,
  },
  {
    id: 'tetris',
    title: 'Tetris',
    categories: ['Klassiker', 'Puzzle'],
    theme: { bg: '#9775fa', edge: '#6741d9', ink: '#ffffff' },
    available: false,
  },
  {
    id: 'breakout',
    title: 'Breakout',
    categories: ['Geschick', 'Action'],
    theme: { bg: '#ff8787', edge: '#e03131', ink: '#ffffff' },
    available: false,
  },
];

export function getGame(id) {
  return GAMES.find((g) => g.id === id);
}
