// Generated and pixel-verified room cutouts and difference-frame atlases.
import { ZOO_KEYS } from './zoo.js';
export const ROOM_IMAGES = Object.freeze({
  ...Object.fromEntries(['A-01', 'B-01', 'C-01', 'D-13', 'E-23', 'F-08'].map(id => [id, `./assets/room/objects/${id.toLowerCase()}-v1.webp`])),
  ...Object.fromEntries(ZOO_KEYS.map(id => [id, `./assets/room/objects/${id.toLowerCase()}-v1.webp`])),
  ...Object.fromEntries(['E-13','E-14','E-15','E-16'].map(id => [id, `./assets/room/objects/${id.toLowerCase()}-v1.webp`])),
  "A": "./assets/room/objects/a-v1.webp",
  "B": "./assets/room/objects/b-v1.webp",
  "C": "./assets/room/objects/c-v1.webp",
  "D-01": "./assets/room/objects/d-01-v1.webp",
  "D-02": "./assets/room/objects/d-02-v1.webp",
  "D-03": "./assets/room/objects/d-03-v1.webp",
  "E-01": "./assets/room/objects/e-01-v1.webp",
  "E-02": "./assets/room/objects/e-02-v1.webp",
  "E-03": "./assets/room/objects/e-03-v1.webp",
  "E-04": "./assets/room/objects/e-04-v1.webp",
  "E-05": "./assets/room/objects/e-05-v1.webp",
  "E-06": "./assets/room/objects/e-06-v1.webp",
  "E-07": "./assets/room/objects/e-07-v1.webp",
  "E-08": "./assets/room/objects/e-08-v1.webp",
  "E-09": "./assets/room/objects/e-09-v1.webp",
  "E-10": "./assets/room/objects/e-10-v1.webp",
  "E-11": "./assets/room/objects/e-11-v1.webp",
  "E-12": "./assets/room/objects/e-12-v1.webp",
  "D-04": "./assets/room/objects/d-04-v1.webp",
  "F-01": "./assets/room/objects/f-01-v1.webp",
  "F-02": "./assets/room/objects/f-02-v1.webp",
  "F-03": "./assets/room/objects/f-03-v1.webp",
  "F-04": "./assets/room/objects/f-04-v1.webp",
  "F-05": "./assets/room/objects/f-05-v1.webp",
  "F-06": "./assets/room/objects/f-06-v1.webp",
  "F-07": "./assets/room/objects/f-07-v1.webp",
  "D-11": "./assets/room/objects/d-11-v1.webp",
  "D-07": "./assets/room/objects/d-07-v1.webp",
  "D-10": "./assets/room/objects/d-10-v1.webp",
  "LAST": "./assets/room/objects/last-v1.webp",
  "D-05": "./assets/prizes/d-05-v1-480.webp",
  "D-06": "./assets/prizes/d-06-v1-480.webp",
  "D-08": "./assets/prizes/d-08-v1-480.webp",
  "D-09": "./assets/prizes/d-09-v1-480.webp",
  "D-12": "./assets/prizes/d-12-v1-480.webp"
});
export const ROOM_SPRITES = Object.freeze({
  ...Object.fromEntries(['A', 'B', 'C', 'A-01', 'B-01', 'C-01'].map(id => [id, {
    src: `./assets/room/sprites/${id.toLowerCase()}-actions-v1.webp`, columns: 4, rows: 2, cell: 320, frames: 8, kind: 'figure',
  }])),
  ...Object.fromEntries([['D-13', 'cushion'], ['F-08', 'book']].map(([id, kind]) => [id, {
    src: `./assets/room/sprites/${id.toLowerCase()}-v1.webp`, columns: 2, rows: 2, cell: 384, frames: 4, kind,
  }])),
  'E-23': { src: './assets/room/sprites/e-23-v1.webp', columns: 4, rows: 3, cell: 256, frames: 12, kind: 'cat' },
  ...Object.fromEntries(ZOO_KEYS.map(id => [id, { src: `./assets/room/sprites/${id.toLowerCase()}-v1.webp`, columns: 4, rows: 3, cell: 256, frames: 12, kind: 'zoo' }])),
  ...Object.fromEntries(['E-13','E-14','E-15','E-16'].map(id => [id, { src: `./assets/room/sprites/${id.toLowerCase()}-v1.webp`, columns: 4, rows: 3, cell: 256, frames: 12, kind: id === 'E-13' ? 'dog' : 'cat' }])),
  "E-07": {
    "src": "./assets/room/sprites/e-07-v1.webp",
    "columns": 4,
    "rows": 3,
    "cell": 256,
    "frames": 12,
    "kind": "dog"
  },
  "E-08": {
    "src": "./assets/room/sprites/e-08-v1.webp",
    "columns": 4,
    "rows": 3,
    "cell": 256,
    "frames": 12,
    "kind": "dog"
  },
  "E-09": {
    "src": "./assets/room/sprites/e-09-v1.webp",
    "columns": 4,
    "rows": 3,
    "cell": 256,
    "frames": 12,
    "kind": "dog"
  },
  "E-10": {
    "src": "./assets/room/sprites/e-10-v1.webp",
    "columns": 4,
    "rows": 3,
    "cell": 256,
    "frames": 12,
    "kind": "dog"
  },
  "E-11": {
    "src": "./assets/room/sprites/e-11-v1.webp",
    "columns": 4,
    "rows": 3,
    "cell": 256,
    "frames": 12,
    "kind": "dog"
  },
  "E-12": {
    "src": "./assets/room/sprites/e-12-v1.webp",
    "columns": 4,
    "rows": 3,
    "cell": 256,
    "frames": 12,
    "kind": "dog"
  },
  "D-04": {
    "src": "./assets/room/sprites/d-04-v1.webp",
    "columns": 4,
    "rows": 3,
    "cell": 256,
    "frames": 12,
    "kind": "dog"
  },
  "F-01": {
    "src": "./assets/room/sprites/f-01-v1.webp",
    "columns": 2,
    "rows": 2,
    "cell": 384,
    "frames": 4,
    "kind": "book"
  },
  "F-02": {
    "src": "./assets/room/sprites/f-02-v1.webp",
    "columns": 2,
    "rows": 2,
    "cell": 384,
    "frames": 4,
    "kind": "book"
  },
  "F-03": {
    "src": "./assets/room/sprites/f-03-v1.webp",
    "columns": 2,
    "rows": 2,
    "cell": 384,
    "frames": 4,
    "kind": "book"
  },
  "F-04": {
    "src": "./assets/room/sprites/f-04-v1.webp",
    "columns": 2,
    "rows": 2,
    "cell": 384,
    "frames": 4,
    "kind": "book"
  },
  "F-05": {
    "src": "./assets/room/sprites/f-05-v1.webp",
    "columns": 2,
    "rows": 2,
    "cell": 384,
    "frames": 4,
    "kind": "book"
  },
  "F-06": {
    "src": "./assets/room/sprites/f-06-v1.webp",
    "columns": 2,
    "rows": 2,
    "cell": 384,
    "frames": 4,
    "kind": "book"
  },
  "F-07": {
    "src": "./assets/room/sprites/f-07-v1.webp",
    "columns": 2,
    "rows": 2,
    "cell": 384,
    "frames": 4,
    "kind": "book"
  },
  "D-11": {
    "src": "./assets/room/sprites/d-11-v1.webp",
    "columns": 2,
    "rows": 2,
    "cell": 384,
    "frames": 4,
    "kind": "cushion"
  },
  "D-07": {
    "src": "./assets/room/sprites/d-07-v1.webp",
    "columns": 2,
    "rows": 2,
    "cell": 384,
    "frames": 4,
    "kind": "lamp"
  },
  "D-10": {
    "src": "./assets/room/sprites/d-10-v1.webp",
    "columns": 2,
    "rows": 2,
    "cell": 384,
    "frames": 4,
    "kind": "carousel"
  },
  "LAST": {
    "src": "./assets/room/sprites/last-v1.webp",
    "columns": 2,
    "rows": 2,
    "cell": 384,
    "frames": 4,
    "kind": "moon"
  }
});
// Supplemental genuine species poses, virtual frames 12–19. Old atlas URLs stay immutable.
export const PET_ACTION_SPRITES = Object.freeze(Object.fromEntries(ZOO_KEYS.map(id => [id, {
  src: `./assets/room/sprites/${id.toLowerCase()}-species-v1.webp`, columns: 4, rows: 2, cell: 256, frames: 8, offset: 12,
}])));
export const CAT_KEYS = Object.freeze(Object.keys(ROOM_SPRITES).filter(key => ROOM_SPRITES[key].kind === 'cat'));
export const PET_KEYS = Object.freeze(Object.keys(ROOM_SPRITES).filter(key => ['dog','cat','zoo'].includes(ROOM_SPRITES[key].kind)));
export const DOG_KEYS = Object.freeze(Object.keys(ROOM_SPRITES).filter(key => ROOM_SPRITES[key].kind === 'dog'));
