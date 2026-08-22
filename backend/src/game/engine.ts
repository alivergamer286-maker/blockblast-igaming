import { Piece, Shape, createPieceSet } from "./pieces";

export const GRID_SIZE = 8;
export type Board = (string | null)[][];

export interface PlaceResult {
  success: boolean;
  board: Board;
  linesCleared: number;
  pointsEarned: number;
  comboBonus: number;
  streakBonus: number;
  totalPoints: number;
  clearedRows: number[];
  clearedCols: number[];
  isGameOver: boolean;
  newPieces?: Piece[];
  message?: string;
}

export interface GameState {
  board: Board;
  pieces: Piece[];
  score: number;
  linesCleared: number;
  combo: number;
  maxCombo: number;
  streak: number;
}

export function createEmptyBoard(): Board {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => null)
  );
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => [...row]);
}

export function canPlace(board: Board, shape: Shape, row: number, col: number): boolean {
  for (const [dr, dc] of shape) {
    const r = row + dr;
    const c = col + dc;
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return false;
    if (board[r][c] !== null) return false;
  }
  return true;
}

export function placePiece(board: Board, piece: Piece, row: number, col: number): Board {
  const next = cloneBoard(board);
  for (const [dr, dc] of piece.shape) {
    next[row + dr][col + dc] = piece.color;
  }
  return next;
}

export function findFullLines(board: Board): { rows: number[]; cols: number[] } {
  const rows: number[] = [];
  const cols: number[] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    if (board[r].every((cell) => cell !== null)) rows.push(r);
  }
  for (let c = 0; c < GRID_SIZE; c++) {
    let full = true;
    for (let r = 0; r < GRID_SIZE; r++) {
      if (board[r][c] === null) { full = false; break; }
    }
    if (full) cols.push(c);
  }
  return { rows, cols };
}

export function clearLines(board: Board, rows: number[], cols: number[]): Board {
  const next = cloneBoard(board);
  for (const r of rows) for (let c = 0; c < GRID_SIZE; c++) next[r][c] = null;
  for (const c of cols) for (let r = 0; r < GRID_SIZE; r++) next[r][c] = null;
  return next;
}

export function calculateScore(
  cellsPlaced: number,
  linesCleared: number,
  combo: number,
  streak: number
) {
  const placement = cellsPlaced;
  const clear = linesCleared * 80;
  let comboBonus = 0;
  if (linesCleared >= 2) comboBonus = Math.floor(clear * (linesCleared - 1) * 0.5);
  let streakBonus = 0;
  if (streak >= 2 && linesCleared > 0) streakBonus = (streak - 1) * 20;
  return { placement, clear, comboBonus, streakBonus, total: placement + clear + comboBonus + streakBonus };
}

export function canPlaceAny(board: Board, pieces: Piece[]): boolean {
  for (const piece of pieces) {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (canPlace(board, piece.shape, r, c)) return true;
      }
    }
  }
  return false;
}

export function applyMove(state: GameState, pieceIndex: number, row: number, col: number): PlaceResult {
  if (pieceIndex < 0 || pieceIndex >= state.pieces.length) {
    return { success: false, board: state.board, linesCleared: 0, pointsEarned: 0, comboBonus: 0, streakBonus: 0, totalPoints: 0, clearedRows: [], clearedCols: [], isGameOver: false, message: "Invalid piece index" };
  }
  const piece = state.pieces[pieceIndex];
  if (!canPlace(state.board, piece.shape, row, col)) {
    return { success: false, board: state.board, linesCleared: 0, pointsEarned: 0, comboBonus: 0, streakBonus: 0, totalPoints: 0, clearedRows: [], clearedCols: [], isGameOver: false, message: "Cannot place piece here" };
  }
  let board = placePiece(state.board, piece, row, col);
  const { rows, cols } = findFullLines(board);
  const linesCleared = rows.length + cols.length;
  if (linesCleared > 0) board = clearLines(board, rows, cols);
  const newCombo = linesCleared > 0 ? state.combo + 1 : 0;
  const newStreak = linesCleared > 0 ? state.streak + 1 : 0;
  const scoring = calculateScore(piece.size, linesCleared, newCombo, newStreak);
  let remainingPieces = state.pieces.filter((_, i) => i !== pieceIndex);
  let newPieces: Piece[] | undefined;
  if (remainingPieces.length === 0) {
    newPieces = createPieceSet();
    remainingPieces = newPieces;
  }
  const isGameOver = !canPlaceAny(board, remainingPieces);
  return {
    success: true,
    board,
    linesCleared,
    pointsEarned: scoring.total,
    comboBonus: scoring.comboBonus,
    streakBonus: scoring.streakBonus,
    totalPoints: scoring.total,
    clearedRows: rows,
    clearedCols: cols,
    isGameOver,
    newPieces,
  };
}

export function createInitialState(): GameState {
  return {
    board: createEmptyBoard(),
    pieces: createPieceSet(),
    score: 0,
    linesCleared: 0,
    combo: 0,
    maxCombo: 0,
    streak: 0,
  };
}
