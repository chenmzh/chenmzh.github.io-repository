// Original layered SVG product illustrations. Every render has unique paint-server IDs,
// so the hero, prize cards, collection and dialogs can coexist without gradient collisions.
import { astronaut } from './astronaut-art.js';
import { seriesArt } from './series-art.js';
let illustrationId = 0;

function plush(id) {
  return {
    defs: `<radialGradient id="${id}-fur" cx="34%" cy="28%" r="75%"><stop stop-color="#f9f4e9"/><stop offset=".48" stop-color="#e9e4d4"/><stop offset=".85" stop-color="#c8d1bd"/><stop offset="1" stop-color="#a0b49e"/></radialGradient>
      <linearGradient id="${id}-ear" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#e8c6c0"/><stop offset="1" stop-color="#cdaca6"/></linearGradient>
      <linearGradient id="${id}-pillow" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f9df9e"/><stop offset="1" stop-color="#d5aa67"/></linearGradient>`,
    body: `<g data-object="oversized-plush">
      <ellipse cx="207" cy="365" rx="134" ry="20" fill="#718c77" opacity=".15"/>
      <path d="M98 185C55 159 71 96 83 41c4-22 24-23 36-8 25 38 44 81 35 126z" fill="url(#${id}-fur)" stroke="#bdc7b3" stroke-width="1.2"/>
      <path d="M97 58c-9 26-19 77 2 95 7 6 15 0 14-10-2-34-4-64-16-85" fill="url(#${id}-ear)"/>
      <path d="M250 150c-10-60 5-124 36-116 34 8 33 52 29 87-3 28-10 57-37 68z" fill="url(#${id}-fur)" stroke="#bdc7b3" stroke-width="1.2"/>
      <path d="M281 57q-16 33-10 77c5 14 15 9 20-7 6-23 7-60-10-70" fill="url(#${id}-ear)"/>
      <ellipse cx="201" cy="270" rx="116" ry="95" fill="url(#${id}-fur)"/>
      <path d="M102 233q-37 7-39 57c-2 25 28 35 45 12M289 235q39 4 46 48c5 27-19 41-43 24" fill="url(#${id}-fur)" stroke="#bbc8b5" stroke-width="1.2"/>
      <ellipse cx="137" cy="345" rx="48" ry="31" transform="rotate(-9 137 345)" fill="url(#${id}-fur)"/>
      <ellipse cx="272" cy="345" rx="48" ry="31" transform="rotate(9 272 345)" fill="url(#${id}-fur)"/>
      <ellipse cx="138" cy="350" rx="24" ry="15" fill="#d2cbb8" opacity=".6"/><ellipse cx="273" cy="350" rx="24" ry="15" fill="#d2cbb8" opacity=".6"/>
      <path d="M93 170q-5-64 48-73c7-12 17-12 27-10q26-14 48 0 21-8 36 4 54 5 62 65 15 85-110 83-116 7-111-69z" fill="url(#${id}-fur)"/>
      <path d="M142 93l-6 9m18-15-5 11m18-13-5 10m85-1 7 9m11-3 5 9M102 144l-5 6m0 11-6 8m11 44-4 9m210-56 5 7m-7 9 7 7M112 268l-6 9m191-5 8 8" stroke="#f6f2e7" stroke-width="3" stroke-linecap="round"/>
      <ellipse cx="201" cy="190" rx="56" ry="35" fill="#f8f0de" opacity=".85"/>
      <path d="M155 173q12 12 23 0M226 173q12 12 23 0" stroke="#615952" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M197 189q5-4 10 0l-5 6z" fill="#b69286"/><path d="M202 196q-1 11-10 8m10-8q1 11 10 8" stroke="#947c70" stroke-width="2" stroke-linecap="round"/>
      <ellipse cx="141" cy="193" rx="12" ry="6" fill="#deb6a7" opacity=".5"/><ellipse cx="261" cy="193" rx="12" ry="6" fill="#deb6a7" opacity=".5"/>
      <path d="M120 233q82 34 168-1l-9 21q-80 37-150-2z" fill="#9aaa8c"/><path d="M250 250l11 40 19-8-5-37" fill="#8f9f83"/>
      <path d="M121 240q83 33 163 0" stroke="#e5e3c9" stroke-dasharray="3 5" stroke-width="1.5"/>
      <g data-object="crescent-cushion">
      <path d="M224 243c-62-15-99 51-56 86 29 25 71 8 80-17-41 14-73-43-24-69z" fill="url(#${id}-pillow)" stroke="#cda264" stroke-width="1.5"/>
      <path d="M213 250c-48-5-83 60-36 76" stroke="#fff0c0" stroke-width="1.6" stroke-dasharray="3 4"/>
      <path d="M168 285q7 8 14 0" stroke="#9c7753" stroke-width="2.5" stroke-linecap="round"/></g>
      <path d="M114 270q21-6 31 15" stroke="url(#${id}-fur)" stroke-width="33" stroke-linecap="round"/>
      <path d="M290 278q-12-6-28 10" stroke="url(#${id}-fur)" stroke-width="34" stroke-linecap="round"/>
      <rect x="309" y="299" width="16" height="32" rx="2" transform="rotate(-12 309 299)" fill="#c7a277"/><path d="M315 310l3 4 3-4m-6 9h7" stroke="#f9ead1" stroke-width="1.4"/>
      <g fill="#8c9a81" opacity=".23">${Array.from({ length: 40 }, (_, i) => `<circle cx="${119 + (i * 37) % 167}" cy="${113 + (i * 13) % 42}" r=".9"/>`).join('')}</g>
      <path d="M150 355l-4 7m15-8-2 7m104-5 2 8m10-11 4 8" stroke="#afa995" stroke-width="1.5" stroke-linecap="round"/>
    </g>`,
  };
}

function fairy(id) {
  return {
    defs: `<linearGradient id="${id}-berry" x1="115" y1="60" x2="275" y2="280" gradientUnits="userSpaceOnUse"><stop stop-color="#f7b3b4"/><stop offset=".45" stop-color="#dc697d"/><stop offset="1" stop-color="#a63a59"/></linearGradient>
      <radialGradient id="${id}-skin" cx="36%" cy="28%"><stop stop-color="#fff7eb"/><stop offset=".78" stop-color="#f7dfcf"/><stop offset="1" stop-color="#ddb7a5"/></radialGradient>
      <linearGradient id="${id}-wing"><stop stop-color="#fdf1ed" stop-opacity=".85"/><stop offset=".55" stop-color="#e1b9ca" stop-opacity=".45"/><stop offset="1" stop-color="#c28eae" stop-opacity=".65"/></linearGradient>
      <linearGradient id="${id}-leaf" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#acc190"/><stop offset="1" stop-color="#627e60"/></linearGradient>`,
    body: `<g data-object="strawberry-fairy">
      <ellipse cx="200" cy="365" rx="111" ry="16" fill="#ac6f73" opacity=".13"/>
      <path d="M100 339v14c0 32 200 32 200 0v-14" fill="#b98d7e"/><ellipse cx="200" cy="339" rx="100" ry="24" fill="#ead6bc" stroke="#fff1dc" stroke-width="3"/>
      <ellipse cx="200" cy="337" rx="84" ry="17" fill="#aab797"/><path d="M120 342q70-26 153 0" stroke="#ced0b0" stroke-width="2"/>
      <g data-object="translucent-wings" fill="url(#${id}-wing)" stroke="#f2d3de" stroke-width="1.4"><path d="M179 244c-36-28-107-89-75-113 26-19 64 56 75 113z"/><path d="M179 244c-49-56-99-38-73-9 15 15 51 18 73 9z"/><path d="M225 246c53-36 104-113 70-117-34-5-66 85-70 117z"/><path d="M225 246c41-51 91-39 71-12-16 20-51 23-71 12z"/></g>
      <path d="M112 151l56 78m116-79-47 77" stroke="#ddabc0" stroke-width="1"/>
      <path d="M178 287l-7 40 17 6 11-41M211 293l9 39 18-6-7-40" fill="url(#${id}-skin)"/>
      <path d="M169 323q-21 17-5 23 14 4 29-8l-5-12M221 327l-3 12q15 15 31 4 4-8-13-19z" fill="#a84863"/><path d="M165 335l18-6m44 3 12 4" stroke="#f0adbb" stroke-width="3"/>
      <path d="M183 220l-34 67q50 40 105 0l-34-67z" fill="#f5e8d5"/><path d="M152 280q7 27 16 8 9 23 18 5 12 24 23 1 13 18 23-5 13 16 19-8" fill="#fff5e4" stroke="#dbbfb8" stroke-width="1"/>
      <path d="M182 218l-26 58q46 34 91-1l-30-57z" fill="url(#${id}-berry)"/><path d="M174 251q23 15 51 0" stroke="#f6a9b3" stroke-width="1.4"/>
      <g fill="#f6d9a4">${[[176, 267], [194, 258], [211, 277], [230, 266], [201, 243]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="2" ry="3" transform="rotate(-20 ${x} ${y})"/>`).join('')}</g>
      <path d="M181 218l-27 26M220 220l30-24" stroke="url(#${id}-skin)" stroke-width="12" stroke-linecap="round"/>
      <circle cx="252" cy="192" r="7" fill="#f8e4d2"/>
      <path d="M255 194l23-104" stroke="#7e966d" stroke-width="3"/>
      <path d="M251 96q22-51 66-28-13 48-66 28z" fill="url(#${id}-leaf)"/><path d="M255 93l53-21m-29 16 6-14m5 9 12 3" stroke="#d4dcac" stroke-width="1.2"/>
      <path d="M158 186q-12 44 8 52 7-16 18-16l36 1q13 4 19 15 20-24 5-61z" fill="#694950"/>
      <ellipse cx="202" cy="171" rx="49" ry="50" fill="url(#${id}-skin)"/>
      <path d="M154 171q-8-65 48-66 53 1 49 65-22-5-26-27-10 19-24 21l-2-20q-16 23-45 27" fill="#77525b"/>
      <path d="M163 166q14-3 22-18m19 9 10-12" stroke="#a97a7c" stroke-width="2" stroke-linecap="round"/>
      <ellipse cx="184" cy="181" rx="7" ry="10" fill="#57404d"/><ellipse cx="220" cy="181" rx="7" ry="10" fill="#57404d"/>
      <ellipse cx="185" cy="184" rx="4" ry="5" fill="#8e5d70"/><ellipse cx="221" cy="184" rx="4" ry="5" fill="#8e5d70"/><circle cx="181" cy="177" r="2.8" fill="white"/><circle cx="217" cy="177" r="2.8" fill="white"/>
      <path d="M177 172l-3-3m53 3 3-3" stroke="#684b52" stroke-width="2" stroke-linecap="round"/>
      <ellipse cx="170" cy="194" rx="9" ry="4" fill="#eeb0b0" opacity=".7"/><ellipse cx="235" cy="194" rx="9" ry="4" fill="#eeb0b0" opacity=".7"/>
      <path d="M198 202q5 5 10 0" stroke="#b6737c" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M145 139c-3-38 23-67 57-80 36 13 69 44 57 80-30-17-83-17-114 0z" fill="url(#${id}-berry)" stroke="#e797a3" stroke-width="1.5"/>
      <path d="M158 112q6-22 22-31" stroke="#fac4c2" stroke-width="4" stroke-linecap="round" opacity=".75"/>
      <path d="M180 73l-3-22 22 9 14-18 5 23 24-2-15 18-26-6z" fill="url(#${id}-leaf)"/>
      <g fill="#ffe9bf">${[[169, 111], [188, 89], [207, 111], [229, 100], [242, 124], [184, 124]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="2" ry="4" transform="rotate(18 ${x} ${y})"/>`).join('')}</g>
      <path d="M185 219l16 11 20-12-9 18-11-5-10 6z" fill="#81956a"/><circle cx="201" cy="229" r="4" fill="#f2d09e"/>
      <g transform="translate(133 322)"><path d="M0 8l2-23m-1 16q-20-13-18 0 8 9 18 0m2-4q15-17 18-4-1 9-18 4" fill="#839b6e"/><g fill="#f9e9d3"><circle cx="1" cy="-19" r="7"/><circle cx="-7" cy="-13" r="7"/><circle cx="8" cy="-12" r="7"/></g><circle cy="-13" r="4" fill="#dbb46b"/></g>
      <g transform="translate(276 327) scale(.7)"><path d="M0 8v-25" stroke="#869b6c" stroke-width="3"/><g fill="#f3d7d2"><circle cx="0" cy="-22" r="7"/><circle cx="-7" cy="-15" r="7"/><circle cx="7" cy="-15" r="7"/></g><circle cy="-16" r="4" fill="#dfb772"/></g>
    </g>`,
  };
}

function keepsake(kind, color) {
  const face = `<ellipse cx="100" cy="113" rx="30" ry="25" fill="#fff7e9"/><ellipse cx="88" cy="108" rx="3.5" ry="5" fill="#493b3a"/><ellipse cx="112" cy="108" rx="3.5" ry="5" fill="#493b3a"/><ellipse cx="78" cy="119" rx="7" ry="4" fill="#efb3a5"/><ellipse cx="122" cy="119" rx="7" ry="4" fill="#efb3a5"/><path d="M95 120q5 6 10 0" fill="none" stroke="#493b3a" stroke-width="2.5" stroke-linecap="round"/>`;
  if (kind === 'letter') return `<g data-object="illustrated-stationery" transform="rotate(-9 100 105)"><rect x="46" y="50" width="109" height="126" rx="12" fill="#8eab95"/><rect x="41" y="45" width="109" height="126" rx="12" fill="${color}"/><rect x="51" y="55" width="89" height="105" rx="6" fill="#fff8e9"/><path d="M51 61l45 41 44-41" fill="#f3d9c5"/><path d="M53 151l43-39 43 39" fill="#f0e4d4"/><path d="M99 105c-23-18-31 12 0 26 31-14 23-44 0-26" fill="#e08b7d"/><path d="M61 64h20M61 70h15" stroke="#e3c7b0" stroke-width="3"/></g>`;
  if (kind === 'star') return `<g data-object="felt-keyring"><path d="M100 45l20 38 43 7-31 31 6 43-38-21-38 21 6-43-31-31 43-7z" fill="${color}" stroke="#96b3c6" stroke-width="4" stroke-linejoin="round"/>${face}<path d="M95 44v-9a6 6 0 0112 0v11" stroke="#a38a58" stroke-width="4"/><path d="M85 35q-22-38 15-23" stroke="#a38a58" stroke-width="3"/></g>`;
  if (kind === 'moon-sleep') return `<g data-object="sleeping-moon-keepsake"><path d="M137 38c-87-17-141 103-55 138 50 20 94-21 95-54-65 52-138-36-40-84z" fill="#dcc895" stroke="#b9a675" stroke-width="2"/><ellipse cx="124" cy="136" rx="32" ry="27" fill="#d8d3e4"/><ellipse cx="104" cy="111" rx="23" ry="21" fill="#e5dfed"/><ellipse cx="94" cy="87" rx="8" ry="19" fill="#e5dfed" transform="rotate(-25 94 87)"/><ellipse cx="113" cy="89" rx="7" ry="20" fill="#e5dfed" transform="rotate(20 113 89)"/><path d="M88 113q6 6 12 0m7 0q6 6 12 0" stroke="#82768d" stroke-width="2" stroke-linecap="round"/><ellipse cx="99" cy="170" rx="41" ry="8" fill="#b5a8c5"/></g>`;
  return `<g data-object="mini-bear"><ellipse cx="100" cy="149" rx="36" ry="34" fill="${color}"/><ellipse cx="70" cy="174" rx="18" ry="11" fill="${color}"/><ellipse cx="130" cy="174" rx="18" ry="11" fill="${color}"/><ellipse cx="61" cy="144" rx="13" ry="20" fill="${color}" transform="rotate(25 61 144)"/><ellipse cx="139" cy="144" rx="13" ry="20" fill="${color}" transform="rotate(-25 139 144)"/><circle cx="64" cy="67" r="21" fill="${color}"/><circle cx="136" cy="67" r="21" fill="${color}"/><circle cx="64" cy="67" r="11" fill="#edc8b4"/><circle cx="136" cy="67" r="11" fill="#edc8b4"/><rect x="49" y="62" width="102" height="77" rx="38" fill="${color}"/>${face}<ellipse cx="100" cy="156" rx="20" ry="19" fill="#fff7e9" opacity=".7"/><path d="M73 132q27 15 54 0v10q-27 15-54 0z" fill="#bf7959"/><path d="M115 140v25l12-5-3-22z" fill="#bf7959"/></g>`;
}

export function art(kind = 'building', color = '#d6b88a', className = '', motif = null) {
  const id = `mh-art-${++illustrationId}`;
  const factory = { astronaut, cloud: plush, berry: fairy }[kind];
  if (factory) {
    const { defs, body } = factory(id);
    return `<svg class="toy-art art-${kind} ${className}" data-art-kind="${kind}" viewBox="0 0 400 420" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs>${defs}</defs>${body}</svg>`;
  }
  return `<svg class="toy-art art-${kind} ${className}" data-art-kind="${kind}" viewBox="0 0 200 210" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><ellipse cx="100" cy="189" rx="54" ry="9" fill="#514438" opacity=".09"/>${['building', 'vehicle', 'album'].includes(kind) ? seriesArt(kind, color, motif) : keepsake(kind, color)}</svg>`;
}
