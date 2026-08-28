/**
 * Block Blast piece definitions
 * difficultyBias 0–1: higher = prefer larger/awkward pieces (near payout cap)
 */

export type Cell = [number, number];
export type Shape = Cell[];

export interface Piece {
  id: number;
  shape: Shape;
  color: string;
  size: number;
}

export const COLORS = [
  "#FF6B6B", "#4ECDC4", "#FFE66D", "#95E1D3",
  "#F38181", "#AA96DA", "#FCBAD3", "#A8D8EA",
];

export const PIECES: Omit<Piece, "color">[] = [
  { id: 0, shape: [[0, 0]], size: 1 },
  { id: 1, shape: [[0, 0], [0, 1]], size: 2 },
  { id: 2, shape: [[0, 0], [1, 0]], size: 2 },
  { id: 3, shape: [[0, 0], [0, 1], [0, 2]], size: 3 },
  { id: 4, shape: [[0, 0], [1, 0], [2, 0]], size: 3 },
  { id: 5, shape: [[0, 0], [0, 1], [0, 2], [0, 3]], size: 4 },
  { id: 6, shape: [[0, 0], [1, 0], [2, 0], [3, 0]], size: 4 },
  { id: 7, shape: [[0, 0], [0, 1], [1, 0], [1, 1]], size: 4 },
  { id: 8, shape: [[0, 0], [1, 0], [1, 1]], size: 3 },
  { id: 9, shape: [[0, 1], [1, 0], [1, 1]], size: 3 },
  { id: 10, shape: [[0, 0], [0, 1], [1, 0]], size: 3 },
  { id: 11, shape: [[0, 0], [0, 1], [1, 1]], size: 3 },
  { id: 12, shape: [[0, 0], [0, 1], [0, 2], [1, 1]], size: 4 },
  { id: 13, shape: [[0, 1], [1, 0], [1, 1], [1, 2]], size: 4 },
  { id: 14, shape: [[0, 0], [0, 1], [1, 1], [1, 2]], size: 4 },
  { id: 15, shape: [[0, 1], [0, 2], [1, 0], [1, 1]], size: 4 },
  { id: 16, shape: [[0,0],[0,1],[0,2],[1,0],[1,1],[1,2],[2,0],[2,1],[2,2]], size: 9 },
  { id: 17, shape: [[0,0],[0,1],[0,2],[1,0],[1,1],[1,2]], size: 6 },
  { id: 18, shape: [[0,0],[0,1],[1,0],[1,1],[2,0],[2,1]], size: 6 },
  { id: 19, shape: [[0, 0], [1, 0], [2, 0], [2, 1]], size: 4 },
  { id: 20, shape: [[0, 1], [1, 1], [2, 0], [2, 1]], size: 4 },
  { id: 21, shape: [[0, 0], [0, 1], [0, 2], [1, 0], [2, 0]], size: 5 },
];

const EASY_IDS = new Set([0, 1, 2, 3, 4, 7, 8, 9, 10, 11]);
const HARD_IDS = new Set([5, 6, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]);

export function createRandomPiece(difficultyBias = 0): Piece {
  const bias = Math.max(0, Math.min(1, difficultyBias));
  let pool = PIECES;
  if (bias >= 0.75) {
    pool = PIECES.filter((p) => HARD_IDS.has(p.id) || p.size >= 5);
  } else if (bias >= 0.45) {
    // mix weighted to larger
    const hard = PIECES.filter((p) => HARD_IDS.has(p.id));
    const rest = PIECES;
    pool = Math.random() < 0.65 + bias * 0.2 ? hard : rest;
  } else if (bias < 0.2) {
    pool = PIECES.filter((p) => EASY_IDS.has(p.id) || p.size <= 4);
  }
  if (pool.length === 0) pool = PIECES;
  const base = pool[Math.floor(Math.random() * pool.length)];
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  return { ...base, color };
}

export function createPieceSet(difficultyBias = 0): Piece[] {
  return [
    createRandomPiece(difficultyBias),
    createRandomPiece(difficultyBias),
    createRandomPiece(difficultyBias),
  ];
}

export function getPieceBounds(shape: Shape): { width: number; height: number } {
  let maxR = 0, maxC = 0;
  for (const [r, c] of shape) {
    if (r > maxR) maxR = r;
    if (c > maxC) maxC = c;
  }
  return { width: maxC + 1, height: maxR + 1 };
}
