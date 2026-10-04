// Kachel-Illustrationen pro Spiel (inline SVG, 400×300). Jede zeigt, worum es im Spiel geht.

const W = 400;
const H = 300;

function svg(bg, body) {
  return `<svg class="art" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="${W}" height="${H}" fill="${bg}"/>${body}</svg>`;
}

function snake() {
  let checker = '';
  for (let x = 0; x < W; x += 40) {
    for (let y = 0; y < H; y += 40) {
      if ((x + y) % 80 === 0) checker += `<rect x="${x}" y="${y}" width="40" height="40" fill="#a2d149"/>`;
    }
  }
  const path = 'M60 220 H140 V140 H220 V100 H300';
  return svg('#aad751', `
    ${checker}
    <path d="${path}" fill="none" stroke="#000" opacity=".12" stroke-width="32" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 4)"/>
    <path d="${path}" fill="none" stroke="#3a62cc" stroke-width="32" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${path}" fill="none" stroke="#4875ea" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="304" cy="93" r="7" fill="#fff"/><circle cx="306" cy="93" r="3.8" fill="#1b1b1b"/>
    <circle cx="304" cy="107" r="7" fill="#fff"/><circle cx="306" cy="107" r="3.8" fill="#1b1b1b"/>
    <ellipse cx="340" cy="232" rx="18" ry="5" fill="#000" opacity=".12"/>
    <circle cx="331" cy="212" r="15" fill="#e7471d"/><circle cx="347" cy="212" r="15" fill="#e7471d"/>
    <ellipse cx="327" cy="204" rx="4" ry="6" fill="#fff" opacity=".45" transform="rotate(-25 327 204)"/>
    <path d="M339 199 q1 -10 9 -14" stroke="#5d3a1a" stroke-width="4" fill="none" stroke-linecap="round"/>
    <ellipse cx="355" cy="186" rx="10" ry="5" fill="#4caf50" transform="rotate(-25 355 186)"/>
  `);
}

function game2048() {
  const colors = { 2: '#fff9db', 4: '#fff3bf', 8: '#ffc078', 16: '#ffa94d', 32: '#ff922b', 64: '#fd7e14', 128: '#fab005', 2048: '#e8590c' };
  const board = [
    [2, 0, 4, 0],
    [0, 8, 16, 2],
    [32, 64, 128, 0],
    [0, 4, 2048, 8],
  ];
  let cells = '';
  board.forEach((row, r) =>
    row.forEach((v, c) => {
      const x = 80 + 8 + c * 58;
      const y = 30 + 8 + r * 58;
      cells += `<rect x="${x}" y="${y}" width="50" height="50" rx="8" fill="${v ? colors[v] : '#ffe066'}"/>`;
      if (v) {
        const size = v >= 1000 ? 15 : v >= 100 ? 19 : 24;
        const ink = v <= 4 ? '#5c3c00' : '#fff';
        cells += `<text x="${x + 25}" y="${y + 25}" font-size="${size}" fill="${ink}" class="art-num">${v}</text>`;
      }
    }),
  );
  return svg('#ffd43b', `
    <rect x="80" y="30" width="240" height="240" rx="18" fill="#f59f00"/>
    ${cells}
  `);
}

function connect4() {
  const grid = [
    '.......',
    '.......',
    '...Y...',
    '..RR...',
    '.YYRY..',
    'RYRYRR.',
  ];
  const fill = { R: '#fa5252', Y: '#fcc419', '.': '#24477d' };
  let holes = '';
  grid.forEach((row, r) =>
    [...row].forEach((ch, c) => {
      holes += `<circle cx="${58 + 8 + 18 + c * 36}" cy="${60 + 8 + 18 + r * 36}" r="13" fill="${fill[ch]}"/>`;
    }),
  );
  return svg('#24477d', `
    <circle cx="${58 + 26 + 4 * 36}" cy="30" r="13" fill="#fa5252"/>
    <path d="M${58 + 26 + 4 * 36} 4 v8" stroke="#fa5252" stroke-width="3" stroke-linecap="round" opacity=".5"/>
    <rect x="58" y="60" width="284" height="232" rx="16" fill="#4c6ef5"/>
    ${holes}
  `);
}

function pairs() {
  const star = (cx, cy) =>
    `<path d="M${cx} ${cy - 22} l6.5 13.5 14.5 2 -10.5 10.2 2.5 14.5 -13 -7 -13 7 2.5 -14.5 -10.5 -10.2 14.5 -2z" fill="#fcc419"/>`;
  const cards = [
    [45, 40, -4, false], [130, 40, 0, true], [215, 40, 3, false], [300, 40, 0, false],
    [45, 160, 2, false], [130, 160, 0, false], [215, 160, -3, false], [300, 160, 0, true],
  ];
  const body = cards
    .map(([x, y, rot, open]) => {
      const cx = x + 35;
      const cy = y + 48;
      const inner = open
        ? `<rect x="${x}" y="${y}" width="70" height="96" rx="10" fill="#fff"/>${star(cx, cy)}`
        : `<rect x="${x}" y="${y}" width="70" height="96" rx="10" fill="#1c3d6e"/><rect x="${x + 7}" y="${y + 7}" width="56" height="82" rx="6" fill="none" stroke="#4dabf7" stroke-width="2" stroke-dasharray="4 4"/><text x="${cx}" y="${cy}" font-size="30" fill="#74c0fc" class="art-num">?</text>`;
      return `<g transform="rotate(${rot} ${cx} ${cy})">${inner}</g>`;
    })
    .join('');
  return svg('#74c0fc', body);
}

function minesweeper() {
  const map = [
    '##F#####',
    '#2211###',
    '#1..1F##',
    '#1..112#',
    '##1..1M#',
    '###11###',
  ];
  const numColor = { 1: '#1c7ed6', 2: '#2b8a3e', 3: '#e03131' };
  let cells = '';
  map.forEach((row, r) =>
    [...row].forEach((ch, c) => {
      const x = 40 + c * 40;
      const y = 30 + r * 40;
      if (ch === '#' || ch === 'F') {
        cells += `<rect x="${x + 2}" y="${y + 2}" width="36" height="36" rx="6" fill="#adb5bd"/><rect x="${x + 2}" y="${y + 2}" width="36" height="32" rx="6" fill="#f8f9fa"/>`;
        if (ch === 'F') {
          cells += `<path d="M${x + 16} ${y + 9} v20" stroke="#343a40" stroke-width="3" stroke-linecap="round"/><path d="M${x + 17} ${y + 9} l12 6 -12 6z" fill="#fa5252"/>`;
        }
      } else {
        cells += `<rect x="${x + 2}" y="${y + 2}" width="36" height="36" rx="6" fill="${ch === 'M' ? '#ff8787' : '#ced4da'}"/>`;
        if (numColor[ch]) cells += `<text x="${x + 20}" y="${y + 21}" font-size="22" fill="${numColor[ch]}" class="art-num">${ch}</text>`;
        if (ch === 'M') {
          cells += `<circle cx="${x + 20}" cy="${y + 20}" r="9" fill="#212529"/><path d="M${x + 20} ${y + 6} v28 M${x + 6} ${y + 20} h28 M${x + 10} ${y + 10} l20 20 M${x + 30} ${y + 10} l-20 20" stroke="#212529" stroke-width="3" stroke-linecap="round"/><circle cx="${x + 17}" cy="${y + 17}" r="2.5" fill="#fff"/>`;
        }
      }
    }),
  );
  return svg('#dee2e6', cells);
}

function blocks() {
  const color = { I: '#66d9e8', O: '#ffe066', T: '#f783ac', S: '#8ce99a', Z: '#ff8787', J: '#74c0fc', L: '#ffc078' };
  // Von unten nach oben
  const stack = [
    'JJJZZ.OOLL',
    'J.TZZSOOL.',
    '..TTSS..L.',
    '..T..S....',
  ];
  const size = 34;
  const x0 = (W - 10 * size) / 2;
  const block = (col, row, ch) => {
    const x = x0 + col * size;
    const y = H - (row + 1) * size;
    return `<rect x="${x + 2}" y="${y + 2}" width="${size - 4}" height="${size - 4}" rx="6" fill="${color[ch]}"/><rect x="${x + 7}" y="${y + 7}" width="${size - 18}" height="6" rx="3" fill="#fff" opacity=".5"/>`;
  };
  let blocks = '';
  stack.forEach((row, r) => [...row].forEach((ch, c) => ch !== '.' && (blocks += block(c, r, ch))));
  // Fallendes I und L
  [5, 6, 7, 8].forEach((r) => (blocks += block(5, r, 'I')));
  [[1, 6], [1, 7], [1, 8], [2, 6]].forEach(([c, r]) => (blocks += block(c, r, 'L')));
  return svg('#9775fa', `
    <rect x="${x0 - 6}" y="-10" width="${10 * size + 12}" height="${H + 20}" rx="12" fill="#7048e8" opacity=".55"/>
    ${blocks}
  `);
}

function bricks() {
  const rowColors = ['#ffffff', '#ffe3e3', '#ffd8a8', '#fff3bf'];
  const missing = new Set(['1-3', '1-4', '2-4', '0-6', '3-1', '3-2', '2-5']);
  let bricks = '';
  rowColors.forEach((fill, r) => {
    for (let c = 0; c < 8; c++) {
      if (missing.has(`${r}-${c}`)) continue;
      bricks += `<rect x="${11 + c * 48}" y="${30 + r * 24}" width="42" height="18" rx="5" fill="${fill}"/>`;
    }
  });
  return svg('#ff8787', `
    ${bricks}
    <path d="M200 250 L232 176 L262 120" stroke="#fff" stroke-width="3" stroke-dasharray="2 10" stroke-linecap="round" fill="none" opacity=".8"/>
    <circle cx="232" cy="176" r="11" fill="#fff"/>
    <rect x="150" y="254" width="104" height="18" rx="9" fill="#183153"/>
  `);
}

const ART = { snake, 2048: game2048, connect4, pairs, minesweeper, blocks, bricks };

export function art(game) {
  const fn = ART[game.id];
  return fn ? fn() : svg(game.theme.bg, `<text x="200" y="150" font-size="48" fill="${game.theme.ink}" class="art-num">${game.title}</text>`);
}
