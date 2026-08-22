import { useEffect, useState } from "react";
import { getLeaderboard, getDailyLeaderboard } from "../services/api";

interface Entry {
  rank: number;
  username: string;
  score: number;
  linesCleared: number;
  maxCombo: number;
  date: string;
}

export default function LeaderboardPage() {
  const [tab, setTab] = useState<"global" | "daily">("global");
  const [data, setData] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const fn = tab === "global" ? getLeaderboard : getDailyLeaderboard;
    fn()
      .then((res) => setData(res.data.leaderboard))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [tab]);

  return (
    <div style={styles.page}>
      <h2 className="pixel" style={{ fontSize: 16, marginBottom: 20 }}>
        Ranking
      </h2>

      <div style={styles.tabs}>
        <button
          style={{
            ...styles.tab,
            background: tab === "global" ? "#e94560" : "#2a2a40",
          }}
          onClick={() => setTab("global")}
        >
          Global
        </button>
        <button
          style={{
            ...styles.tab,
            background: tab === "daily" ? "#e94560" : "#2a2a40",
          }}
          onClick={() => setTab("daily")}
        >
          Diário
        </button>
      </div>

      {loading ? (
        <p style={{ color: "#a0a0b0", marginTop: 32 }}>Carregando...</p>
      ) : data.length === 0 ? (
        <p style={{ color: "#a0a0b0", marginTop: 32 }}>Nenhum score ainda</p>
      ) : (
        <div style={styles.table}>
          <div style={styles.headerRow}>
            <span style={{ width: 40 }}>#</span>
            <span style={{ flex: 1 }}>Jogador</span>
            <span style={{ width: 90, textAlign: "right" }}>Score</span>
            <span style={{ width: 50, textAlign: "right" }}>Combo</span>
          </div>
          {data.map((entry) => (
            <div key={`${entry.rank}-${entry.username}`} style={styles.row}>
              <span
                style={{
                  width: 40,
                  fontWeight: 700,
                  color:
                    entry.rank === 1
                      ? "#f1c40f"
                      : entry.rank === 2
                      ? "#bdc3c7"
                      : entry.rank === 3
                      ? "#e67e22"
                      : "#a0a0b0",
                }}
              >
                {entry.rank}
              </span>
              <span style={{ flex: 1, fontWeight: 600 }}>{entry.username}</span>
              <span style={{ width: 90, textAlign: "right", fontWeight: 700 }}>
                {entry.score.toLocaleString()}
              </span>
              <span
                style={{
                  width: 50,
                  textAlign: "right",
                  color: "#f1c40f",
                }}
              >
                {entry.maxCombo}x
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    width: "100%",
    maxWidth: 480,
  },
  tabs: {
    display: "flex",
    gap: 8,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    padding: "10px 0",
    borderRadius: 8,
    color: "#fff",
    fontWeight: 600,
    fontSize: 14,
  },
  table: {
    background: "#1a1a2e",
    borderRadius: 12,
    overflow: "hidden",
  },
  headerRow: {
    display: "flex",
    padding: "12px 16px",
    borderBottom: "1px solid #2a2a40",
    fontSize: 12,
    color: "#a0a0b0",
    fontWeight: 600,
  },
  row: {
    display: "flex",
    padding: "12px 16px",
    borderBottom: "1px solid #222236",
    fontSize: 14,
    alignItems: "center",
  },
};
