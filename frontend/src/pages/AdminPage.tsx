import { useEffect, useState } from "react";
import {
  adminStats,
  adminUsers,
  adminSetStatus,
  adminAdjustBalance,
  adminAudit,
} from "../services/api";

export default function AdminPage() {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    try {
      setError("");
      const [s, u, a] = await Promise.all([
        adminStats(),
        adminUsers(1, search),
        adminAudit(1),
      ]);
      setStats(s.data);
      setUsers(u.data.items || []);
      setAudit(a.data.items || []);
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || "Erro ao carregar admin");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function ban(id: string) {
    const reason = prompt("Motivo do ban?") || "Banned by admin";
    await adminSetStatus(id, "banned", reason);
    setMsg("Usuário banido");
    load();
  }

  async function unban(id: string) {
    await adminSetStatus(id, "active");
    setMsg("Usuário reativado");
    load();
  }

  async function credit(id: string) {
    const amount = Number(prompt("Valor a creditar (ex: 100)"));
    if (!Number.isFinite(amount) || amount === 0) return;
    const reason = prompt("Motivo") || "Admin adjustment";
    await adminAdjustBalance(id, amount, reason);
    setMsg("Saldo ajustado");
    load();
  }

  return (
    <div style={{ width: "100%", maxWidth: 960 }}>
      <h1 style={{ marginBottom: 16 }}>Painel Admin</h1>
      {error && <p style={{ color: "#e94560" }}>{error}</p>}
      {msg && <p style={{ color: "#2ecc71" }}>{msg}</p>}

      {stats && (
        <div style={styles.grid}>
          <Card title="Usuários" value={stats.users} />
          <Card title="Sessões ativas" value={stats.activeSessions} />
          <Card title="Volume apostas" value={stats.totalBetVolume} />
          <Card title="Saques pendentes" value={stats.pendingWithdrawals} />
        </div>
      )}

      <div style={{ display: "flex", gap: 8, margin: "20px 0" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar email/username"
          style={styles.input}
        />
        <button style={styles.btn} onClick={load}>
          Buscar
        </button>
      </div>

      <h2>Usuários</h2>
      <div style={{ overflowX: "auto" }}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th>User</th>
              <th>Saldo</th>
              <th>Role</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <div>{u.username}</div>
                  <div style={{ color: "#888", fontSize: 12 }}>{u.email}</div>
                </td>
                <td>R$ {Number(u.balance).toFixed(2)}</td>
                <td>{u.role}</td>
                <td>{u.status}</td>
                <td style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {u.status === "banned" ? (
                    <button style={styles.btnSmall} onClick={() => unban(u.id)}>
                      Unban
                    </button>
                  ) : (
                    <button style={styles.btnDanger} onClick={() => ban(u.id)}>
                      Ban
                    </button>
                  )}
                  <button style={styles.btnSmall} onClick={() => credit(u.id)}>
                    Ajustar saldo
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={{ marginTop: 32 }}>Audit log</h2>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {audit.map((a) => (
          <li key={a.id} style={styles.auditItem}>
            <strong>{a.action}</strong>{" "}
            <span style={{ color: "#888" }}>
              {a.actor?.username || "system"} ·{" "}
              {new Date(a.createdAt).toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Card({ title, value }: { title: string; value: number | string }) {
  return (
    <div style={styles.card}>
      <div style={{ color: "#888", fontSize: 12 }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 12,
  },
  card: {
    background: "#1a1a2e",
    border: "1px solid #2a2a40",
    borderRadius: 12,
    padding: 16,
  },
  input: {
    flex: 1,
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #2a2a40",
    background: "#12121c",
    color: "#fff",
  },
  btn: {
    padding: "10px 16px",
    borderRadius: 8,
    border: "none",
    background: "#e94560",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
  },
  btnSmall: {
    padding: "6px 10px",
    borderRadius: 6,
    border: "1px solid #2a2a40",
    background: "#1a1a2e",
    color: "#eaeaea",
    cursor: "pointer",
    fontSize: 12,
  },
  btnDanger: {
    padding: "6px 10px",
    borderRadius: 6,
    border: "1px solid #e94560",
    background: "transparent",
    color: "#e94560",
    cursor: "pointer",
    fontSize: 12,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 14,
  },
  auditItem: {
    padding: "8px 0",
    borderBottom: "1px solid #2a2a40",
    fontSize: 13,
  },
};
