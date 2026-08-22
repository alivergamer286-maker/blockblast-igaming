import { useState } from "react";
import Board from "../game/Board";
import PieceTray from "../game/PieceTray";
import { useGameStore } from "../store/gameStore";
import { useAuthStore } from "../store/authStore";
import { startGame, placePiece, endGame, getBalance } from "../services/api";

export default function GamePage() {
  const {
    sessionId,
    score,
    combo,
    maxCombo,
    isGameOver,
    selectedPiece,
    setSession,
    updateAfterMove,
    reset,
  } = useGameStore();

  const setBalance = useAuthStore((s) => s.setBalance);
  const [loading, setLoading] = useState(false);
  const [betAmount, setBetAmount] = useState(0);
  const [error, setError] = useState("");
  const [lastPoints, setLastPoints] = useState<number | null>(null);

  async function handleStart() {
    setLoading(true);
    setError("");
    try {
      const { data } = await startGame(betAmount);
      setSession({
        sessionId: data.sessionId,
        board: data.board,
        pieces: data.pieces,
        score: data.score,
      });
      if (data.balance !== undefined) {
        setBalance(data.balance);
      } else {
        const bal = await getBalance();
        setBalance(bal.data.balance);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Erro ao iniciar");
    } finally {
      setLoading(false);
    }
  }

  async function handlePlace(row: number, col: number) {
    if (selectedPiece === null || !sessionId || isGameOver) return;
    setError("");
    try {
      const { data } = await placePiece(sessionId, selectedPiece, row, col);
      updateAfterMove({
        board: data.board,
        pieces: data.pieces,
        score: data.score,
        combo: data.combo,
        maxCombo: data.maxCombo,
        isGameOver: data.isGameOver,
        clearedRows: data.clearedRows,
        clearedCols: data.clearedCols,
      });
      setLastPoints(data.pointsEarned);
      setTimeout(() => setLastPoints(null), 800);

      if (data.isGameOver && data.payout !== undefined) {
        const bal = await getBalance();
        setBalance(bal.data.balance);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Jogada inválida");
    }
  }

  async function handleEnd() {
    if (!sessionId) return;
    try {
      await endGame(sessionId);
      const bal = await getBalance();
      setBalance(bal.data.balance);
    } catch {
      /* ignore */
    }
    reset();
  }

  if (!sessionId) {
    return (
      <div style={styles.lobby}>
        <h2 className="pixel" style={{ fontSize: 18, marginBottom: 8 }}>
          Nova Partida
        </h2>
        <p style={{ color: "#a0a0b0", marginBottom: 24, fontSize: 14 }}>
          Grid 8×8 · 3 peças por turno · Sem rotação
        </p>

        <div style={styles.betBox}>
          <label style={{ fontSize: 13, color: "#a0a0b0" }}>
            Aposta (opcional)
          </label>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            {[0, 5, 10, 25, 50].map((v) => (
              <button
                key={v}
                style={{
                  ...styles.betBtn,
                  background: betAmount === v ? "#e94560" : "#2a2a40",
                }}
                onClick={() => setBetAmount(v)}
              >
                {v === 0 ? "Free" : `R$${v}`}
              </button>
            ))}
          </div>
        </div>

        {error && <p style={{ color: "#e74c3c", marginBottom: 12 }}>{error}</p>}

        <button style={styles.startBtn} onClick={handleStart} disabled={loading}>
          {loading ? "Carregando..." : "Jogar"}
        </button>
      </div>
    );
  }

  return (
    <div style={styles.game}>
      <div style={styles.hud}>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Score</span>
          <span style={styles.statValue}>{score.toLocaleString()}</span>
          {lastPoints !== null && lastPoints > 0 && (
            <span style={styles.pointsPop}>+{lastPoints}</span>
          )}
        </div>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Combo</span>
          <span style={{ ...styles.statValue, color: combo > 0 ? "#f1c40f" : "#eaeaea" }}>
            {combo}x
          </span>
        </div>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Max</span>
          <span style={styles.statValue}>{maxCombo}x</span>
        </div>
      </div>

      <Board onPlace={handlePlace} />
      <PieceTray />

      {error && (
        <p style={{ color: "#e74c3c", marginTop: 8, fontSize: 13 }}>{error}</p>
      )}

      {isGameOver && (
        <div style={styles.overlay}>
          <div style={styles.gameOverCard}>
            <h2 className="pixel" style={{ fontSize: 16, marginBottom: 12 }}>
              GAME OVER
            </h2>
            <p style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>
              {score.toLocaleString()}
            </p>
            <p style={{ color: "#a0a0b0", marginBottom: 20, fontSize: 13 }}>
              Max Combo: {maxCombo}x
            </p>
            <button style={styles.startBtn} onClick={handleEnd}>
              Jogar de novo
            </button>
          </div>
        </div>
      )}

      {!isGameOver && (
        <button style={styles.quitBtn} onClick={handleEnd}>
          Desistir
        </button>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  lobby: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    maxWidth: 420,
    width: "100%",
    padding: 24,
  },
  betBox: {
    width: "100%",
    marginBottom: 24,
  },
  betBtn: {
    flex: 1,
    padding: "10px 0",
    borderRadius: 8,
    color: "#fff",
    fontWeight: 600,
    fontSize: 13,
  },
  startBtn: {
    background: "linear-gradient(135deg, #e94560, #c23152)",
    color: "#fff",
    borderRadius: 12,
    padding: "16px 48px",
    fontWeight: 700,
    fontSize: 16,
    boxShadow: "0 4px 20px rgba(233,69,96,0.4)",
  },
  game: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
    maxWidth: 400,
    position: "relative",
  },
  hud: {
    display: "flex",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 16,
    gap: 12,
  },
  stat: {
    flex: 1,
    background: "#1a1a2e",
    borderRadius: 10,
    padding: "10px 12px",
    textAlign: "center",
    position: "relative",
  },
  statLabel: {
    display: "block",
    fontSize: 11,
    color: "#a0a0b0",
    marginBottom: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 700,
  },
  pointsPop: {
    position: "absolute",
    top: -8,
    right: 8,
    color: "#2ecc71",
    fontWeight: 700,
    fontSize: 14,
    animation: "fadeUp 0.8s ease forwards",
  },
  overlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(15,15,26,0.85)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    zIndex: 10,
  },
  gameOverCard: {
    background: "#1a1a2e",
    borderRadius: 16,
    padding: "32px 40px",
    textAlign: "center",
    border: "1px solid #2a2a40",
  },
  quitBtn: {
    marginTop: 16,
    background: "transparent",
    color: "#a0a0b0",
    fontSize: 13,
    textDecoration: "underline",
  },
};
