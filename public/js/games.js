// Spiele-Katalog. Neues Spiel: Eintrag hier ergänzen, Modul unter /games/<id>.js anlegen
// und eine passende Kachel-Illustration in art.js hinzufügen.
// Das Modul exportiert `mount(container, api)` und gibt eine Cleanup-Funktion zurück.
//
// theme: bg = Kachelfarbe, edge = dicker Rand unten, ink = Textfarbe auf der Kachel
// levels: Auswahl im Spielmenü (id wird dem Spiel als api.level übergeben), jede Stufe mit eigener Farbe
// slots: Shop-Kategorien des Spiels (pro Slot ist ein Artikel ausgerüstet, siehe shop_items.slot)

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
    slots: [{ id: 'snake', label: 'Design' }],
    badge: 'NEU',
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
    description: 'Lass deine Steine in die Spalten fallen und bilde als Erster eine Reihe aus vier – waagerecht, senkrecht oder diagonal. Spiele gegen den Computer in vier Stärken – bis „Ultra“ – oder zu zweit an einem Gerät.',
    controls: 'Maus: Spalte anklicken. Tastatur: ← → zum Zielen, Enter, Leertaste oder ↓ zum Einwerfen – oder direkt die Tasten 1–7. Auf dem Handy: Spalte antippen.',
    theme: { bg: '#24477d', edge: '#14294a', ink: '#ffffff' },
    levels: [
      { id: 'easy', name: 'Leicht', sub: 'Gegen den Computer', color: '#40c057' },
      { id: 'medium', name: 'Mittel', sub: 'Gegen den Computer', color: '#fab005' },
      { id: 'hard', name: 'Schwer', sub: 'Gegen den Computer', color: '#fd7e14' },
      { id: 'ultra', name: 'Ultra', sub: 'Kaum zu schlagen', color: '#e03131' },
      { id: 'duo', name: 'Zu zweit', sub: 'An einem Gerät', color: '#4c6ef5' },
    ],
    badge: 'NEU',
    featured: true,
    available: true,
  },
  {
    id: 'cubejump',
    title: 'Würfelsprung',
    categories: ['Geschick', 'Action'],
    teaser: 'Spring im Takt über Stacheln – schaffst du alle drei Level bis 100 %?',
    description: 'Dein Würfel rast von selbst durch das Level, du bestimmst nur, wann er springt. Weich Stacheln aus, lande auf Blöcken und nutze gelbe Sprungplatten und Ringe. Jedes Level ist bei jedem Versuch gleich: Merk dir die Stellen und arbeite dich bis 100 % vor.',
    controls: 'Leertaste, ↑ oder Klick zum Springen – gedrückt halten springt bei jeder Landung erneut. Gelbe Ringe in der Luft anklicken. P pausiert. Im Shop gibt es Themes für die Level und Skins für den Würfel.',
    theme: { bg: '#f06595', edge: '#c2255c', ink: '#ffffff' },
    levels: [
      { id: 'easy', name: 'Leicht', sub: 'ca. 30 s · Tempo 1×', color: '#7048e8' },
      { id: 'medium', name: 'Mittel', sub: 'ca. 30 s · Tempo 1,15×', color: '#1c7ed6' },
      { id: 'hard', name: 'Schwer', sub: 'ca. 30 s · Tempo 1,3×', color: '#c2255c' },
    ],
    slots: [
      { id: 'cubejump-theme', label: 'Theme' },
      { id: 'cubejump-skin', label: 'Würfel' },
    ],
    badge: 'NEU',
    featured: true,
    available: true,
  },
  {
    id: 'watermelon',
    title: 'Watermelon Drop',
    categories: ['Puzzle', 'Geschick'],
    teaser: 'Zwei gleiche Früchte verschmelzen – schaffst du die Wassermelone?',
    description: 'Lass Früchte aus der Wolke in die Kiste fallen. Berühren sich zwei gleiche, verschmelzen sie zur nächstgrößeren: aus Kirschen werden Erdbeeren, Trauben, Mandarinen … bis zur Wassermelone. Die Früchte rollen und stapeln sich wie echt – ragt eine zu lange über den Rand, ist die Kiste voll.',
    controls: 'Maus bewegen und klicken, auf dem Handy ziehen und loslassen. Tastatur: ← → zielen, Leertaste oder ↓ fallen lassen, P pausiert. Dein Spielstand wird automatisch gespeichert. Im Shop gibt es Bälle und Planeten statt Früchten.',
    theme: { bg: '#40c057', edge: '#2b8a3e', ink: '#ffffff' },
    slots: [{ id: 'watermelon', label: 'Design' }],
    badge: 'NEU',
    featured: true,
    available: true,
  },
  {
    id: 'pairs',
    title: 'Paare finden',
    categories: ['Puzzle', 'Klassiker'],
    teaser: 'Decke Karten auf und finde alle Paare mit möglichst wenigen Zügen.',
    description: 'Decke immer zwei Karten auf. Zeigen sie dasselbe Motiv, bleiben sie offen – sonst werden sie wieder zugedeckt. Merk dir, wo was liegt, und finde alle Paare mit möglichst wenigen Zügen.',
    controls: 'Karte anklicken oder antippen. Tastatur: mit den Pfeiltasten wählen, Enter oder Leertaste deckt auf.',
    theme: { bg: '#74c0fc', edge: '#1c7ed6', ink: '#0b2a4a' },
    levels: [
      { id: 'easy', name: '12 Karten', sub: '6 Paare', color: '#4dabf7' },
      { id: 'medium', name: '20 Karten', sub: '10 Paare', color: '#7950f2' },
      { id: 'hard', name: '30 Karten', sub: '15 Paare', color: '#e64980' },
    ],
    badge: 'NEU',
    available: true,
  },
  {
    id: 'minesweeper',
    title: 'Minesweeper',
    categories: ['Puzzle', 'Klassiker'],
    teaser: 'Finde alle Minen – die Zahlen verraten, wie viele in der Nähe liegen.',
    description: 'Decke alle Felder auf, unter denen keine Mine liegt. Jede Zahl zeigt, wie viele Minen um das Feld herum versteckt sind. Markiere Minen mit Flaggen – und denk nach, bevor du klickst.',
    controls: 'Linksklick deckt auf, Rechtsklick setzt eine Flagge. Klick auf eine Zahl deckt die Nachbarn auf, wenn genug Flaggen stehen. Tastatur: Pfeiltasten, Enter, F für Flagge. Handy: lange drücken für eine Flagge.',
    theme: { bg: '#dee2e6', edge: '#868e96', ink: '#212529' },
    levels: [
      { id: 'easy', name: 'Leicht', sub: '9 × 9 · 10 Minen', color: '#40c057' },
      { id: 'medium', name: 'Mittel', sub: '16 × 16 · 40 Minen', color: '#fab005' },
      { id: 'hard', name: 'Schwer', sub: '30 × 16 · 99 Minen', color: '#e03131' },
    ],
    badge: 'NEU',
    available: true,
  },
  {
    id: 'blocks',
    title: 'Blockfall',
    categories: ['Klassiker', 'Puzzle'],
    teaser: 'Dreh und schieb die fallenden Blöcke – volle Reihen verschwinden.',
    description: 'Fallende Blöcke aus vier Feldern: Schieb und dreh sie so, dass volle Reihen entstehen – die verschwinden und bringen Punkte. Vier Reihen auf einmal geben am meisten. Alle 10 Reihen steigt das Level und alles wird schneller.',
    controls: '← → schieben, ↑ oder X drehen, Z andersherum, ↓ schneller fallen, Leertaste sofort fallen lassen, C oder Shift halten, P pausiert. Auf dem Handy gibt es Tasten unter dem Spielfeld.',
    theme: { bg: '#9775fa', edge: '#6741d9', ink: '#ffffff' },
    badge: 'NEU',
    available: true,
  },
  {
    id: 'bricks',
    title: 'Mauerbrecher',
    categories: ['Geschick', 'Action'],
    teaser: 'Lenk den Ball mit dem Schläger und räum Mauer für Mauer ab.',
    description: 'Halte den Ball mit dem Schläger im Spiel und zerschlage alle Steine. Gelbe Steine brauchen zwei Treffer. Fang die fallenden Kapseln für einen breiteren Schläger, mehr Bälle oder ein Extraleben.',
    controls: 'Maus oder ← → bewegen den Schläger, Klick oder Leertaste startet den Ball, P oder Esc pausiert. Wo der Ball den Schläger trifft, bestimmt den Abprallwinkel.',
    theme: { bg: '#ff8787', edge: '#e03131', ink: '#ffffff' },
    badge: 'NEU',
    available: true,
  },
];

export function getGame(id) {
  return GAMES.find((g) => g.id === id);
}
