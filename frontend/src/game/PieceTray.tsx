import { useGameStore, Piece } from "../store/gameStore";

const CELL = 22;

export default function PieceTray() {
  const pieces = useGameStore((s) => s.pieces);
  const selected = useGameStore((s) => s.selectedPiece);
  const selectPiece = useGameStore((s) => s.selectPiece);

  return (
    <div style={styles.tray}>
      {pieces.map((piece, i) => (
        <div
          key={`${piece.id}-${i}`}
          style={{
            ...styles.slot,
            outline: selected === i ? "3px solid #e94560" : "3px solid transparent",
            transform: selected === i ? "scale(1.08)" : "scale(1)",
          }}
          onClick={() => selectPiece(selected === i ? null : i)}
        >
          <PiecePreview piece={piece} />
        </div>
      ))}
      {Array.from({ length: 3 - pieces.length }).map((_, i) => (
        <div key={`empty-${i}`} style={{ ...styles.slot, opacity: 0.3 }} />
      ))}
    </div>
  );
}

function PiecePreview({ piece }: { piece: Piece }) {
  let maxR = 0, maxC = 0;
  for (const [r, c] of piece.shape) {
    if (r > maxR) maxR = r;
    if (c > maxC) maxC = c;
  }
  const w = (maxC + 1) * (CELL + 2);
  const h = (maxR + 1) * (CELL + 2);

  return (
    <div style={{ position: "relative", width: w, height: h }}>
      {piece.shape.map(([r, c], i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: c * (CELL + 2),
            top: r * (CELL + 2),
            width: CELL,
            height: CELL,
            background: piece.color,
            borderRadius: 4,
            boxShadow: "inset 0 2px 4px rgba(255,255,255,0.25)",
          }}
        />
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  tray: {
    display: "flex",
    gap: 16,
    justifyContent: "center",
    alignItems: "center",
    padding: "16px 0",
  },
  slot: {
    width: 100,
    height: 100,
    background: "#1a1a2e",
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
};
