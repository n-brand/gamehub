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

function cubejump() {
  const spikeAt = (x) =>
    `<path d="M${x} 230 ${x + 22} 186 ${x + 44} 230Z" fill="#1b1e3b"/><path d="M${x + 13} 227 ${x + 22} 204 ${x + 31} 227Z" fill="#fff" opacity=".35"/>`;
  return svg('#f06595', `
    <rect x="-10" y="40" width="70" height="70" rx="8" fill="#fff" opacity=".12" transform="rotate(20 25 75)"/>
    <rect x="300" y="18" width="90" height="90" rx="10" fill="#fff" opacity=".1" transform="rotate(-15 345 63)"/>
    <rect y="230" width="400" height="70" fill="#c2255c"/>
    <rect y="227" width="400" height="5" fill="#fff" opacity=".85"/>
    ${spikeAt(196)}${spikeAt(240)}
    <circle cx="325" cy="118" r="20" fill="#ffd43b" fill-opacity=".25" stroke="#ffd43b" stroke-width="6"/>
    <path d="M50 226Q100 110 150 104" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="2 10" stroke-linecap="round" opacity=".8"/>
    <rect x="72" y="150" width="11" height="11" fill="#fff" opacity=".55"/>
    <rect x="92" y="128" width="9" height="9" fill="#fff" opacity=".4"/>
    <g transform="rotate(20 150 112)">
      <rect x="122" y="84" width="56" height="56" rx="9" fill="#f08c00"/>
      <rect x="122" y="84" width="56" height="50" rx="9" fill="#ffd43b"/>
      <rect x="133" y="95" width="34" height="29" rx="5" fill="#ffe066"/>
      <rect x="139" y="103" width="7" height="8" fill="#183153"/><rect x="154" y="103" width="7" height="8" fill="#183153"/>
      <rect x="141" y="116" width="18" height="4" fill="#183153"/>
    </g>
  `);
}

function watermelon() {
  const face = (x, y, s) =>
    `<ellipse cx="${x - s}" cy="${y}" rx="${s * 0.32}" ry="${s * 0.4}" fill="#183153"/><ellipse cx="${x + s}" cy="${y}" rx="${s * 0.32}" ry="${s * 0.4}" fill="#183153"/>` +
    `<circle cx="${x - s * 1.1}" cy="${y - s * 0.16}" r="${s * 0.13}" fill="#fff"/><circle cx="${x + s * 0.9}" cy="${y - s * 0.16}" r="${s * 0.13}" fill="#fff"/>` +
    `<path d="M${x - s * 0.35} ${y + s * 0.55}q${s * 0.35} ${s * 0.4} ${s * 0.7} 0" stroke="#183153" stroke-width="${s * 0.2}" fill="none" stroke-linecap="round"/>`;
  const shine = (x, y, r) =>
    `<ellipse cx="${x - r * 0.42}" cy="${y - r * 0.45}" rx="${r * 0.24}" ry="${r * 0.14}" transform="rotate(-40 ${x - r * 0.42} ${y - r * 0.45})" fill="#fff" opacity=".45"/>`;
  return svg('#40c057', `
    <circle cx="352" cy="46" r="70" fill="#fff" opacity=".1"/>
    <circle cx="30" cy="250" r="44" fill="#fff" opacity=".08"/>
    <rect x="78" y="118" width="244" height="200" fill="#fff9db"/>
    <rect x="62" y="110" width="16" height="210" rx="8" fill="#e8590c"/>
    <rect x="322" y="110" width="16" height="210" rx="8" fill="#e8590c"/>
    <rect x="62" y="110" width="16" height="16" rx="8" fill="#ff922b"/>
    <rect x="322" y="110" width="16" height="16" rx="8" fill="#ff922b"/>
    <path d="M200 120 V176" stroke="#e8590c" stroke-width="3" stroke-dasharray="6 7" stroke-linecap="round" opacity=".45"/>
    <circle cx="146" cy="242" r="66" fill="#51cf66"/>
    <ellipse cx="146" cy="242" rx="22" ry="65" fill="none" stroke="#2b8a3e" stroke-width="8"/>
    <ellipse cx="146" cy="242" rx="50" ry="66" fill="none" stroke="#2b8a3e" stroke-width="8"/>
    <ellipse cx="146" cy="258" rx="30" ry="20" fill="#51cf66"/>
    ${face(146, 252, 11)}${shine(146, 242, 66)}
    <circle cx="282" cy="268" r="40" fill="#ffa94d"/>
    <path d="M283 230q12-17 30-11q-11 15-30 11z" fill="#40c057"/>
    ${face(282, 274, 8)}${shine(282, 268, 40)}
    <circle cx="234" cy="215" r="26" fill="#7950f2"/>
    <path d="M234 189q2-9 7-12" stroke="#8c6b4f" stroke-width="4" fill="none" stroke-linecap="round"/>
    ${face(234, 219, 6)}${shine(234, 215, 26)}
    <path d="M100 148l-12-8 9 12-14 2 15 4-5 10 9-8 4 11 1-12 11 5-8-10 12-6z" fill="#2f9e44"/>
    <circle cx="100" cy="166" r="20" fill="#f03e3e"/>
    <circle cx="92" cy="178" r="2" fill="#ffe066"/><circle cx="110" cy="176" r="2" fill="#ffe066"/><circle cx="101" cy="182" r="2" fill="#ffe066"/>
    ${face(100, 166, 5)}${shine(100, 166, 20)}
    <path d="M201 84q2-14 12-22" stroke="#5c940d" stroke-width="4" fill="none" stroke-linecap="round"/>
    <circle cx="200" cy="100" r="17" fill="#e03131"/>
    ${face(200, 103, 4)}${shine(200, 100, 17)}
    <ellipse cx="200" cy="66" rx="40" ry="15" fill="#e9ecef"/>
    <circle cx="183" cy="56" r="15" fill="#fff"/><circle cx="202" cy="48" r="19" fill="#fff"/><circle cx="220" cy="58" r="13" fill="#fff"/>
    <ellipse cx="200" cy="64" rx="37" ry="11" fill="#fff"/>
    <circle cx="194" cy="56" r="2.4" fill="#183153"/><circle cx="208" cy="56" r="2.4" fill="#183153"/>
  `);
}

const ART = { snake, 2048: game2048, connect4, cubejump, watermelon, pairs, minesweeper, blocks, bricks };

export function art(game) {
  const fn = ART[game.id];
  return fn ? fn() : svg(game.theme.bg, `<text x="200" y="150" font-size="48" fill="${game.theme.ink}" class="art-num">${game.title}</text>`);
}
