import { create } from "zustand";

export type Board = (string | null)[][];

export interface Piece {
  id: number;
  shape: [number, number][];
  color: string;
  size: number;
}

interface GameState {
  sessionId: string | null;
  board: Board;
  pieces: Piece[];
  score: number;
  combo: number;
  maxCombo: number;
  isGameOver: boolean;
  selectedPiece: number | null;
  lastCleared: { rows: number[]; cols: number[] } | null;

  setSession: (data: {
    sessionId: string;
    board: Board;
    pieces: Piece[];
    score: number;
  }) => void;

  updateAfterMove: (data: {
    board: Board;
    pieces: Piece[];
    score: number;
    combo: number;
    maxCombo: number;
    isGameOver: boolean;
    clearedRows: number[];
    clearedCols: number[];
  }) => void;

  selectPiece: (index: number | null) => void;
  reset: () => void;
}

const emptyBoard = (): Board =>
  Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => null));

export const useGameStore = create<GameState>((set) => ({
  sessionId: null,
  board: emptyBoard(),
  pieces: [],
  score: 0,
  combo: 0,
  maxCombo: 0,
  isGameOver: false,
  selectedPiece: null,
  lastCleared: null,

  setSession: (data) =>
    set({
      sessionId: data.sessionId,
      board: data.board,
      pieces: data.pieces,
      score: data.score,
      combo: 0,
      maxCombo: 0,
      isGameOver: false,
      selectedPiece: null,
      lastCleared: null,
    }),

  updateAfterMove: (data) =>
    set({
      board: data.board,
      pieces: data.pieces,
      score: data.score,
      combo: data.combo,
      maxCombo: data.maxCombo,
      isGameOver: data.isGameOver,
      selectedPiece: null,
      lastCleared: {
        rows: data.clearedRows,
        cols: data.clearedCols,
      },
    }),

  selectPiece: (index) => set({ selectedPiece: index }),

  reset: () =>
    set({
      sessionId: null,
      board: emptyBoard(),
      pieces: [],
      score: 0,
      combo: 0,
      maxCombo: 0,
      isGameOver: false,
      selectedPiece: null,
      lastCleared: null,
    }),
}));
