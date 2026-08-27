import { useEffect, useMemo, useState } from "react";
import Board from "../game/Board";
import PieceTray from "../game/PieceTray";
import { useGameStore } from "../store/gameStore";
import { useAuthStore } from "../store/authStore";
import {
  startGame,
  placePiece,
  endGame,
  getBalance,
  resendVerification,
} from "../services/api";

function eventEndMs() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export default function GamePage() {
  const {
    sessionId,
    score,
    combo,
    maxCombo,
    streak,
    streakGrace,
    isGameOver,
    selectedPiece,
    nearMiss,
    setSession,
    updateAfterMove,
    clearNearMiss,
    reset,
  } = useGameStore();

  const setBalance = useAuthStore((s) => s.setBalance);
  const balance = useAuthStore((s) => s.user?.balance ?? 0);
  const emailVerified = useAuthStore((s) => s.user?.emailVerified);
  const [loading, setLoading] = useState(false);
  const [betAmount, setBetAmount] = useState(10);
  const [customBet, setCustomBet] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [lastPoints, setLastPoints] = useState<number | null>(null);
  const [potentialWin, setPotentialWin] = useState(0);
  const [sessionBet, setSessionBet] = useState(0);
  const [cashoutResult, setCashoutResult] = useState<{
    payout: number;
    profit: number;
  } | null>(null);
  const [now, setNow] = useState(Date.now());
  const [gamesToday, setGamesToday] = useState(() =>
    Number(localStorage.getItem("bb_games_today") || 0)
  );

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!nearMiss) return;
    const t = setTimeout(() => clearNearMiss(), 1200);
    return () => clearTimeout(t);
  }, [nearMiss, clearNearMiss]);

  const countdown = useMemo(() => {
    const left = Math.max(0, eventEndMs() - now);
    const h = Math.floor(left / 3600000);
    const m = Math.floor((left % 3600000) / 60000);
    const s = Math.floor((left % 60000) / 1000);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, [now]);

  const streakPct = Math.min(100, streak * 12);

  function resolvedBet() {
    if (customBet.trim() !== "") {
      const n = Number(customBet.replace(",", "."));
      return Number.isFinite(n) ? n : betAmount;
    }
    return betAmount;
  }

  async function handleResend() {
    try {
      await resendVerification();
      setMsg("E-mail de confirmação reenviado");
    } catch (err: any) {
      setError(err.response?.data?.error || "Falha ao reenviar");
    }
  }

  async function handleStart() {
    if (!emailVerified) {
      setError("Confirme seu e-mail antes de jogar");
      return;
    }
    setLoading(true);
    setError("");
    setCashoutResult(null);
    try {
      const bet = resolvedBet();
      const { data } = await startGame(bet);
      setSession({
        sessionId: data.sessionId,
        board: data.board,
        pieces: data.pieces,
        score: data.score,
      });
      setSessionBet(data.betAmount ?? bet);
      setPotentialWin(data.potentialWin ?? 0);
      const next = gamesToday + 1;
      setGamesToday(next);
      localStorage.setItem("bb_games_today", String(next));
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
        pointsEarned: data.pointsEarned,
        nearMiss: data.nearMiss,
        linesCleared: data.linesCleared,
      });
      setLastPoints(data.pointsEarned);
      setPotentialWin(data.potentialWin ?? 0);
      setTimeout(() => setLastPoints(null), 800);

      if (data.isGameOver) {
        const bal = await getBalance();
        setBalance(bal.data.balance);
        if (data.payout !== undefined) {
          setCashoutResult({
            payout: data.payout,
            profit: Math.round((data.payout - sessionBet) * 100) / 100,
          });
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Jogada inválida");
    }
  }

  async function handleEnd() {
    if (!sessionId) return;
    try {
      const { data } = await endGame(sessionId);
      setCashoutResult({
        payout: data.payout ?? 0,
        profit: data.profit ?? 0,
      });
      const bal = await getBalance();
      setBalance(bal.data.balance);
    } catch {
      /* ignore */
    }
    reset();
  }

  if (!sessionId) {
    const dailyLeft = Math.max(0, 3 - gamesToday);
    return (
      <div style={styles.lobby}>
        <div style={styles.eventBanner}>
          <span style={{ fontWeight: 700, color: "#f1c40f" }}>Evento do dia</span>
          <span style={{ fontSize: 13, color: "#ccc" }}>
            multi 1.5x · acaba em {countdown}
          </span>
        </div>

        <h2 className="pixel" style={{ fontSize: 18, marginBottom: 8 }}>
          Nova Partida
        </h2>
        <p style={{ color: "#a0a0b0", marginBottom: 4, fontSize: 14 }}>
          saldo{" "}
          <span style={{ color: "#2ecc71", fontWeight: 700 }}>
            R$ {balance.toFixed(2)}
          </span>
        </p>
        <p style={{ color: "#888", fontSize: 12, marginBottom: 12 }}>
          meta diária: {dailyLeft === 0 ? "bônus liberado ✨" : `mais ${dailyLeft} partida(s)`}
        </p>

        {!emailVerified && (
          <div style={styles.verifyBox}>
            <p style={{ margin: 0, fontSize: 14 }}>
              Confirme seu e-mail para liberar o jogo.
            </p>
            <button style={styles.resendBtn} onClick={handleResend}>
              Reenviar e-mail
            </button>
          </div>
        )}

        <div style={styles.betBox}>
          <label style={{ fontSize: 13, color: "#a0a0b0" }}>Valor rápido</label>
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            {[1, 5, 10, 25, 50, 100].map((v) => (
              <button
                key={v}
                style={{
                  ...styles.betBtn,
                  background: betAmount === v && !customBet ? "#e94560" : "#2a2a40",
                }}
                onClick={() => {
                  setBetAmount(v);
                  setCustomBet("");
                }}
              >
                R${v}
              </button>
            ))}
          </div>
          <label style={{ fontSize: 13, color: "#a0a0b0", display: "block", marginTop: 16 }}>
            Ou valor livre
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            placeholder="Ex: 15.50"
            value={customBet}
            onChange={(e) => setCustomBet(e.target.value)}
            style={styles.input}
          />
          <p style={{ color: "#888", fontSize: 12, marginTop: 8 }}>
            Valor da partida: <strong>R$ {resolvedBet().toFixed(2)}</strong>
          </p>
        </div>

        {error && <p style={{ color: "#e74c3c", marginBottom: 12 }}>{error}</p>}
        {msg && <p style={{ color: "#2ecc71", marginBottom: 12 }}>{msg}</p>}

        <button
          style={{ ...styles.startBtn, opacity: emailVerified ? 1 : 0.5 }}
          onClick={handleStart}
          disabled={loading || !emailVerified}
        >
          {loading ? "Carregando..." : "Jogar"}
        </button>

        {cashoutResult && (
          <div style={styles.lastResult}>
            <p style={{ color: "#2ecc71", fontWeight: 700, margin: 0 }}>
              você saiu com {cashoutResult.profit >= 0 ? "+" : ""}
              R$ {cashoutResult.profit.toFixed(2)}
            </p>
            <p style={{ color: "#888", fontSize: 12, margin: "4px 0 0" }}>
              prêmio R$ {cashoutResult.payout.toFixed(2)}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={styles.game}>
      <div style={styles.streakWrap}>
        <div style={styles.streakTop}>
          <span style={{ fontSize: 12, color: "#f1c40f", fontWeight: 700 }}>
            STREAK {streak}
            {streakGrace === 0 && streak > 0 ? " · última chance" : ""}
          </span>
          <span style={{ fontSize: 11, color: "#888" }}>combo {combo}x</span>
        </div>
        <div style={styles.streakTrack}>
          <div
            className="streak-bar-fill"
            style={{
              width: `${streakPct}%`,
              height: "100%",
              borderRadius: 99,
              background:
                streak > 0
                  ? "linear-gradient(90deg, #e67e22, #f1c40f)"
                  : "#2a2a40",
            }}
          />
        </div>
      </div>

      <div style={styles.hud}>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Score</span>
          <span style={styles.statValue}>{score.toLocaleString()}</span>
          {lastPoints !== null && lastPoints > 0 && (
            <span className="points-float" style={styles.pointsPop}>
              +{lastPoints}
            </span>
          )}
        </div>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Stake</span>
          <span style={styles.statValue}>R$ {sessionBet.toFixed(2)}</span>
        </div>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Ganho atual</span>
          <span style={{ ...styles.statValue, color: "#2ecc71" }}>
            R$ {potentialWin.toFixed(2)}
          </span>
        </div>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Max combo</span>
          <span style={styles.statValue}>{maxCombo}x</span>
        </div>
      </div>

      <div style={{ position: "relative", width: "100%" }}>
        <Board onPlace={handlePlace} />
        {nearMiss && (
          <div style={styles.nearMissOverlay}>
            <span className="near-miss-label">quase!</span>
            <span
              style={{
                textDecoration: "line-through",
                color: "#aaa",
                fontSize: 13,
                marginTop: 4,
              }}
            >
              +{nearMiss.missedValue} pts
            </span>
          </div>
        )}
      </div>

      <div className="piece-bounce" style={{ width: "100%" }}>
        <PieceTray />
      </div>

      {error && (
        <p style={{ color: "#e74c3c", marginTop: 8, fontSize: 13 }}>{error}</p>
      )}

      {isGameOver && (
        <div style={styles.overlay}>
          <div style={styles.gameOverCard}>
            <h2 className="pixel" style={{ fontSize: 14, marginBottom: 12 }}>
              FIM DE JOGO
            </h2>
            <p style={{ fontSize: 32, fontWeight: 700, marginBottom: 4 }}>
              {score.toLocaleString()}
            </p>
            <p style={{ color: "#2ecc71", marginBottom: 6, fontWeight: 700 }}>
              prêmio R$ {(cashoutResult?.payout ?? potentialWin).toFixed(2)}
            </p>
            <p style={{ color: "#a0a0b0", marginBottom: 8, fontSize: 13 }}>
              max combo {maxCombo}x · streak {streak}
            </p>
            <p style={{ color: "#f1c40f", fontSize: 12, marginBottom: 16 }}>
              ranking momentâneo · continue subindo
            </p>
            <button style={styles.startBtn} onClick={handleEnd}>
              Continuar
            </button>
          </div>
        </div>
      )}

      {!isGameOver && (
        <button style={styles.cashoutBtn} onClick={handleEnd}>
          Encerrar · R$ {potentialWin.toFixed(2)}
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
  eventBanner: {
    width: "100%",
    background: "linear-gradient(90deg, #2a1a00, #1a1a2e)",
    border: "1px solid #f1c40f55",
    borderRadius: 12,
    padding: "10px 14px",
    marginBottom: 16,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  lastResult: {
    marginTop: 20,
    padding: 14,
    borderRadius: 12,
    background: "#122018",
    border: "1px solid #2ecc7144",
    width: "100%",
    textAlign: "center",
  },
  verifyBox: {
    width: "100%",
    background: "#2a1a20",
    border: "1px solid #e94560",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    alignItems: "flex-start",
  },
  resendBtn: {
    background: "#e94560",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "8px 14px",
    fontWeight: 600,
    cursor: "pointer",
  },
  betBox: { width: "100%", marginBottom: 24 },
  betBtn: {
    flex: "1 1 60px",
    padding: "10px 0",
    borderRadius: 8,
    color: "#fff",
    fontWeight: 600,
    fontSize: 13,
    border: "none",
    cursor: "pointer",
  },
  input: {
    width: "100%",
    marginTop: 8,
    padding: "12px 14px",
    borderRadius: 8,
    border: "1px solid #2a2a40",
    background: "#12121c",
    color: "#fff",
    fontSize: 16,
    boxSizing: "border-box",
  },
  startBtn: {
    background: "linear-gradient(135deg, #e94560, #c23152)",
    color: "#fff",
    borderRadius: 12,
    padding: "16px 48px",
    fontWeight: 700,
    fontSize: 16,
    boxShadow: "0 4px 20px rgba(233,69,96,0.4)",
    border: "none",
    cursor: "pointer",
  },
  game: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
    maxWidth: 400,
    position: "relative",
  },
  streakWrap: { width: "100%", marginBottom: 12 },
  streakTop: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  streakTrack: {
    height: 8,
    background: "#2a2a40",
    borderRadius: 99,
    overflow: "hidden",
  },
  hud: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    width: "100%",
    marginBottom: 16,
    gap: 10,
  },
  stat: {
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
  statValue: { fontSize: 16, fontWeight: 700 },
  pointsPop: {
    position: "absolute",
    top: -8,
    right: 8,
    color: "#2ecc71",
    fontWeight: 700,
    fontSize: 14,
  },
  nearMissOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "40%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    pointerEvents: "none",
    zIndex: 5,
  },
  overlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(15,15,26,0.88)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    zIndex: 10,
  },
  gameOverCard: {
    background: "#1a1a2e",
    borderRadius: 16,
    padding: "28px 36px",
    textAlign: "center",
    border: "1px solid #2a2a40",
  },
  cashoutBtn: {
    marginTop: 16,
    background: "#2ecc71",
    color: "#0f0f1a",
    fontWeight: 700,
    border: "none",
    borderRadius: 10,
    padding: "12px 20px",
    cursor: "pointer",
    fontSize: 14,
  },
};
