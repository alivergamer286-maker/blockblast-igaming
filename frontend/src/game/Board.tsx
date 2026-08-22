import { useRef, useEffect, useCallback } from "react";
import { useGameStore, Board as BoardType, Piece } from "../store/gameStore";

const CELL = 44;
const GAP = 3;
const SIZE = 8;
const BOARD_PX = SIZE * (CELL + GAP) - GAP;

interface Props {
  onPlace: (row: number, col: number) => void;
}

export default function Board({ onPlace }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const board = useGameStore((s) => s.board);
  const pieces = useGameStore((s) => s.pieces);
  const selectedPiece = useGameStore((s) => s.selectedPiece);
  const lastCleared = useGameStore((s) => s.lastCleared);

  const hoverRef = useRef<{ row: number; col: number } | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#1e1e30";
    ctx.beginPath();
    ctx.roundRect(0, 0, BOARD_PX, BOARD_PX, 12);
    ctx.fill();

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const x = c * (CELL + GAP);
        const y = r * (CELL + GAP);
        const color = board[r][c];

        if (color) {
          const grad = ctx.createLinearGradient(x, y, x + CELL, y + CELL);
          grad.addColorStop(0, color);
          grad.addColorStop(1, shadeColor(color, -30));
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(x, y, CELL, CELL, 6);
          ctx.fill();

          ctx.fillStyle = "rgba(255,255,255,0.15)";
          ctx.beginPath();
          ctx.roundRect(x + 2, y + 2, CELL - 4, CELL / 3, 4);
          ctx.fill();
        } else {
          ctx.fillStyle = "#2a2a40";
          ctx.beginPath();
          ctx.roundRect(x, y, CELL, CELL, 6);
          ctx.fill();
        }
      }
    }

    if (selectedPiece !== null && hoverRef.current && pieces[selectedPiece]) {
      const piece = pieces[selectedPiece];
      const { row, col } = hoverRef.current;
      const can = canPlace(board, piece, row, col);

      ctx.globalAlpha = 0.45;
      for (const [dr, dc] of piece.shape) {
        const r = row + dr;
        const c = col + dc;
        if (r >= 0 && r < SIZE && c >= 0 && c < SIZE) {
          const x = c * (CELL + GAP);
          const y = r * (CELL + GAP);
          ctx.fillStyle = can ? piece.color : "#e74c3c";
          ctx.beginPath();
          ctx.roundRect(x, y, CELL, CELL, 6);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }

    if (lastCleared) {
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      for (const r of lastCleared.rows) {
        for (let c = 0; c < SIZE; c++) {
          const x = c * (CELL + GAP);
          const y = r * (CELL + GAP);
          ctx.beginPath();
          ctx.roundRect(x, y, CELL, CELL, 6);
          ctx.fill();
        }
      }
      for (const c of lastCleared.cols) {
        for (let r = 0; r < SIZE; r++) {
          const x = c * (CELL + GAP);
          const y = r * (CELL + GAP);
          ctx.beginPath();
          ctx.roundRect(x, y, CELL, CELL, 6);
          ctx.fill();
        }
      }
    }
  }, [board, pieces, selectedPiece, lastCleared]);

  useEffect(() => {
    draw();
  }, [draw]);

  function getCellFromEvent(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX: number, clientY: number;
    if ("touches" in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    const col = Math.floor(x / (CELL + GAP));
    const row = Math.floor(y / (CELL + GAP));
    if (row < 0 || row >= SIZE || col < 0 || col >= SIZE) return null;
    return { row, col };
  }

  function handleMove(e: React.MouseEvent | React.TouchEvent) {
    const cell = getCellFromEvent(e);
    hoverRef.current = cell;
    draw();
  }

  function handleClick(e: React.MouseEvent | React.TouchEvent) {
    if (selectedPiece === null) return;
    const cell = getCellFromEvent(e);
    if (!cell) return;
    const piece = pieces[selectedPiece];
    if (!piece) return;
    if (canPlace(board, piece, cell.row, cell.col)) {
      onPlace(cell.row, cell.col);
    }
  }

  return (
    <canvas
      ref={canvasRef}
      width={BOARD_PX}
      height={BOARD_PX}
      style={{
        width: "100%",
        maxWidth: BOARD_PX,
        touchAction: "none",
        borderRadius: 12,
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}
      onMouseMove={handleMove}
      onMouseLeave={() => {
        hoverRef.current = null;
        draw();
      }}
      onClick={handleClick}
      onTouchMove={handleMove}
      onTouchEnd={handleClick}
    />
  );
}

function canPlace(
  board: BoardType,
  piece: Piece,
  row: number,
  col: number
): boolean {
  for (const [dr, dc] of piece.shape) {
    const r = row + dr;
    const c = col + dc;
    if (r < 0 || r >= 8 || c < 0 || c >= 8) return false;
    if (board[r][c] !== null) return false;
  }
  return true;
}

function shadeColor(color: string, percent: number): string {
  const num = parseInt(color.replace("#", ""), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + percent));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + percent));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + percent));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
