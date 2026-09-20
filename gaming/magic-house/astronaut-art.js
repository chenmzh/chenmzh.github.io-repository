// A-tier: one fixed, large mechanical astronaut. No animal face or shared doll base.
export function astronaut(id) {
  return {
    defs: `<linearGradient id="${id}-metal" x1="105" y1="95" x2="290" y2="309" gradientUnits="userSpaceOnUse"><stop stop-color="#fff8df"/><stop offset=".35" stop-color="#dfd7bd"/><stop offset=".6" stop-color="#a8b1b4"/><stop offset=".82" stop-color="#f6ebcf"/><stop offset="1" stop-color="#929fa8"/></linearGradient>
      <linearGradient id="${id}-gold" x1="100" y1="60" x2="295" y2="300" gradientUnits="userSpaceOnUse"><stop stop-color="#fff0bc"/><stop offset=".34" stop-color="#d8b16e"/><stop offset=".6" stop-color="#9d703e"/><stop offset=".86" stop-color="#e7c88c"/><stop offset="1" stop-color="#b1844e"/></linearGradient>
      <linearGradient id="${id}-visor" x1="133" y1="94" x2="267" y2="187" gradientUnits="userSpaceOnUse"><stop stop-color="#223b52"/><stop offset=".4" stop-color="#476478"/><stop offset=".6" stop-color="#122637"/><stop offset="1" stop-color="#071927"/></linearGradient>
      <linearGradient id="${id}-blue" x1="140" y1="201" x2="243" y2="343" gradientUnits="userSpaceOnUse"><stop stop-color="#536880"/><stop offset=".5" stop-color="#253c55"/><stop offset="1" stop-color="#0d263b"/></linearGradient>
      <radialGradient id="${id}-orb" cx="32%" cy="25%"><stop stop-color="#e1ebf2"/><stop offset=".45" stop-color="#8eb4c7"/><stop offset=".8" stop-color="#456b8d"/><stop offset="1" stop-color="#18314d"/></radialGradient>
      <radialGradient id="${id}-halo"><stop stop-color="#d1b579" stop-opacity=".32"/><stop offset="1" stop-color="#d1b579" stop-opacity="0"/></radialGradient>`,
    body: `<g data-object="mechanical-astronaut">
      <circle cx="200" cy="195" r="169" fill="url(#${id}-halo)"/>
      <ellipse cx="204" cy="379" rx="133" ry="16" fill="#08121e" opacity=".35"/>
      <path d="M91 346v13c0 37 220 37 220 0v-13z" fill="#152b41" stroke="#b4945f" stroke-width="1.5"/>
      <ellipse cx="201" cy="346" rx="110" ry="25" fill="#31475b" stroke="#ddc58d" stroke-width="2"/>
      <ellipse cx="201" cy="345" rx="96" ry="19" stroke="#8b8b77" stroke-width="1"/>
      <path d="M96 358c25 30 181 30 210 0" stroke="#c4a56d" stroke-width="1"/>
      <rect x="163" y="359" width="77" height="17" rx="2" fill="url(#${id}-gold)"/>
      <text x="201" y="369" text-anchor="middle" fill="#3b4550" font-size="6.5" letter-spacing="1.8" font-family="Georgia,serif">STAR PILOT · A</text>
      <g data-object="thruster-backpack"><rect x="114" y="185" width="170" height="100" rx="19" fill="#455b6f" stroke="#b5a98e" stroke-width="2"/><rect x="101" y="193" width="24" height="95" rx="12" fill="url(#${id}-gold)"/><rect x="274" y="193" width="24" height="95" rx="12" fill="url(#${id}-gold)"/><path d="M106 279h16v20h-16zM277 279h16v20h-16z" fill="#3d576e"/><path d="M106 283h16m155 0h16" stroke="#a5d3db" stroke-width="3"/></g>
      <path d="M154 267l-5 58h42l6-56M210 268l6 57h42l-9-59" fill="url(#${id}-blue)" stroke="#92a0a5" stroke-width="1.5"/>
      <path d="M155 281h36v25h-37zM215 281h35l3 25h-36z" fill="url(#${id}-metal)"/>
      <path d="M160 289h25m37 0h23M158 296h25m39 0h25" stroke="#747f83" stroke-width="1"/>
      <path d="M149 316q-22 7-24 26c14 14 46 16 69 4l-3-30zM216 316l-2 30c23 12 55 10 69-4-2-19-24-26-24-26z" fill="url(#${id}-metal)" stroke="#758893" stroke-width="1.5"/>
      <path d="M125 342q36 14 69 2M214 344q36 14 69-2" stroke="#243e52" stroke-width="8" stroke-linecap="round"/>
      <path d="M145 204q55-20 109 0l-4 64q-48 28-99 0z" fill="url(#${id}-metal)" stroke="#788c98" stroke-width="2"/>
      <path d="M150 256q53 19 99 0l-1 19q-49 21-95-1z" fill="url(#${id}-blue)"/><path d="M168 265h11m9 2h11m10 0h11m9-2h10" stroke="#c9b57d" stroke-width="3"/>
      <rect x="172" y="215" width="58" height="35" rx="8" fill="#263e52" stroke="#ccb77f" stroke-width="1.7"/>
      <path d="M190 237l11-15 11 15-11-5z" fill="#e9c780"/><circle cx="219" cy="226" r="2" fill="#a5dae1"/><circle cx="219" cy="234" r="2" fill="#dfbb77"/>
      <path d="M166 207l-2 33M236 207l3 31" stroke="#e8e3cb" stroke-width="3"/>
      <path d="M151 209q-30-13-43 12l-5 42 28 8 22-35" fill="url(#${id}-metal)" stroke="#7c8e95" stroke-width="1.7"/>
      <ellipse cx="120" cy="223" rx="15" ry="18" fill="#3c5266"/><path d="M107 224q11 6 23 0" stroke="#bca470" stroke-width="3"/>
      <path d="M102 254l31 9-7 19-30-10z" fill="url(#${id}-gold)"/>
      <path d="M99 272q-12 15-4 29 13 10 25-2l8-17" fill="url(#${id}-metal)" stroke="#88969b" stroke-width="1.5"/><path d="M101 282l-1 11m8-7-1 12m8-10-2 8" stroke="#81919a" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M248 209q26-15 43 7l16 30-24 15-31-27" fill="url(#${id}-metal)" stroke="#86959a" stroke-width="1.7"/><ellipse cx="276" cy="220" rx="16" ry="17" fill="#3b5367"/><path d="M268 213l13 11m-18 0 12 11" stroke="#d7be85" stroke-width="2"/>
      <path d="M286 246l24-17 10 13-22 19z" fill="url(#${id}-gold)"/><path d="M301 231q8-18 23-14 17 11 5 25-13 7-22 1" fill="url(#${id}-metal)" stroke="#92a1a5" stroke-width="1.5"/>
      <g data-object="orbit-globe"><circle cx="323" cy="202" r="26" fill="url(#${id}-orb)"/><ellipse cx="323" cy="202" rx="39" ry="10" transform="rotate(-23 323 202)" stroke="#d8bf85" stroke-width="2"/><path d="M310 191q7-14 19-8" stroke="#deebef" stroke-width="2.5" stroke-linecap="round"/><path d="M314 207l13-12 7 8-8 15" fill="#799daa" opacity=".7"/></g>

      <ellipse cx="201" cy="201" rx="53" ry="15" fill="#243b50" stroke="#e0c992" stroke-width="3"/>


      <path d="M125 111q2-57 76-57 75 0 76 57v48q-1 43-76 43-76 0-76-43z" fill="url(#${id}-metal)" stroke="#b8c0b8" stroke-width="2"/>


      <path d="M141 81q25-20 59-19 37-1 60 21" stroke="#fff7df" stroke-width="4" stroke-linecap="round" opacity=".75"/>
      <path d="M191 54V42h20v13" fill="#b8aa8b"/><path d="M201 42V29" stroke="#d6bd82" stroke-width="3"/><circle cx="201" cy="25" r="7" fill="#f2d993"/>

      <rect x="110" y="117" width="25" height="44" rx="11" fill="url(#${id}-gold)"/><rect x="267" y="117" width="25" height="44" rx="11" fill="url(#${id}-gold)"/><path d="M118 129v20m165-20v20" stroke="#667f8c" stroke-width="3" stroke-linecap="round"/>
      <rect x="139" y="95" width="124" height="84" rx="33" fill="#b1935b"/><rect x="145" y="101" width="112" height="72" rx="28" fill="url(#${id}-visor)" stroke="#f1d696" stroke-width="1.5"/>

      <path d="M159 117q7-10 19-10h41" stroke="#dce9e8" stroke-width="4" stroke-linecap="round" opacity=".45"/><path d="M151 146q2 20 22 22" stroke="#8ba2ac" stroke-width="1.5" opacity=".5"/>
      <rect x="171" y="136" width="13" height="7" rx="3.5" fill="#f4d28a"/><rect x="218" y="136" width="13" height="7" rx="3.5" fill="#f4d28a"/><path d="M194 155h15" stroke="#70989c" stroke-width="2" stroke-linecap="round"/>
      <path d="M165 190h71" stroke="#a2a99e" stroke-width="2"/><circle cx="156" cy="182" r="2" fill="#687f8c"/><circle cx="244" cy="182" r="2" fill="#687f8c"/>
      <g fill="#ecd6a1"><path class="celestial-spark" d="M78 100l3-9 3 9 9 3-9 3-3 9-3-9-9-3z"/><path class="celestial-spark" style="--spark-delay:1s" d="M315 71l2-7 2 7 7 2-7 2-2 7-2-7-7-2z"/><circle cx="96" cy="187" r="2"/><circle cx="307" cy="125" r="2"/></g>
    </g>`,
  };
}
