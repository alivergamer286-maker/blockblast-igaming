import { create } from "zustand";

export type Board = (string | null)[][];

export interface Piece {
  id: number;
  shape: [number, number][];
  color: string;
  size: number;
}

export interface NearMiss {
  rows: number[];
  cols: number[];
  missedValue: number;
}

interface GameState {
  sessionId: string | null;
  board: Board;
  pieces: Piece[];
  score: number;
  combo: number;
  maxCombo: number;
  streak: number;
  streakGrace: number;
  isGameOver: boolean;
  selectedPiece: number | null;
  lastCleared: { rows: number[]; cols: number[] } | null;
  nearMiss: NearMiss | null;
  shake: boolean;
  lastPoints: number;

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
    pointsEarned?: number;
    nearMiss?: NearMiss | null;
    linesCleared?: number;
  }) => void;

  selectPiece: (index: number | null) => void;
  clearNearMiss: () => void;
  clearShake: () => void;
  reset: () => void;
}

const emptyBoard = (): Board =>
  Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => null));

export const useGameStore = create<GameState>((set, get) => ({
  sessionId: null,
  board: emptyBoard(),
  pieces: [],
  score: 0,
  combo: 0,
  maxCombo: 0,
  streak: 0,
  streakGrace: 1,
  isGameOver: false,
  selectedPiece: null,
  lastCleared: null,
  nearMiss: null,
  shake: false,
  lastPoints: 0,

  setSession: (data) =>
    set({
      sessionId: data.sessionId,
      board: data.board,
      pieces: data.pieces,
      score: data.score,
      combo: 0,
      maxCombo: 0,
      streak: 0,
      streakGrace: 1,
      isGameOver: false,
      selectedPiece: null,
      lastCleared: null,
      nearMiss: null,
      shake: false,
      lastPoints: 0,
    }),

  updateAfterMove: (data) => {
    const prev = get();
    let streak = prev.streak;
    let streakGrace = prev.streakGrace;
    const cleared = (data.linesCleared ?? data.clearedRows.length + data.clearedCols.length) > 0;

    if (cleared) {
      streak = prev.streak + 1;
      streakGrace = 1;
    } else {
      if (streakGrace > 0 && prev.streak > 0) {
        streakGrace = 0;
      } else {
        streak = 0;
        streakGrace = 1;
      }
    }

    set({
      board: data.board,
      pieces: data.pieces,
      score: data.score,
      combo: data.combo,
      maxCombo: data.maxCombo,
      streak,
      streakGrace,
      isGameOver: data.isGameOver,
      selectedPiece: null,
      lastCleared: {
        rows: data.clearedRows,
        cols: data.clearedCols,
      },
      nearMiss: data.nearMiss ?? null,
      shake: cleared,
      lastPoints: data.pointsEarned ?? 0,
    });
  },

  selectPiece: (index) => set({ selectedPiece: index }),
  clearNearMiss: () => set({ nearMiss: null }),
  clearShake: () => set({ shake: false }),

  reset: () =>
    set({
      sessionId: null,
      board: emptyBoard(),
      pieces: [],
      score: 0,
      combo: 0,
      maxCombo: 0,
      streak: 0,
      streakGrace: 1,
      isGameOver: false,
      selectedPiece: null,
      lastCleared: null,
      nearMiss: null,
      shake: false,
      lastPoints: 0,
    }),
}));
