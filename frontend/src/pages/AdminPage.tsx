import { useEffect, useState } from "react";
import {
  adminStats,
  adminUsers,
  adminSetStatus,
  adminAdjustBalance,
  adminAudit,
  adminAffiliates,
  adminCreateAffiliate,
  adminAffiliateDetail,
  adminGetConfig,
  adminUpdateConfig,
} from "../services/api";

type Tab = "overview" | "users" | "affiliates" | "config" | "audit";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [affiliateDetail, setAffiliateDetail] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [audit, setAudit] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [affTarget, setAffTarget] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    try {
      setError("");
      const [s, u, a, aff, cfg] = await Promise.all([
        adminStats(),
        adminUsers(1, search),
        adminAudit(1),
        adminAffiliates(1),
        adminGetConfig(),
      ]);
      setStats(s.data);
      setUsers(u.data.items || []);
      setAudit(a.data.items || []);
      setAffiliates(aff.data.items || []);
      setConfig(cfg.data);
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
    const amount = Number(prompt("Valor a creditar/debitar (ex: 100 ou -50)"));
    if (!Number.isFinite(amount) || amount === 0) return;
    const reason = prompt("Motivo") || "Admin adjustment";
    await adminAdjustBalance(id, amount, reason);
    setMsg("Saldo ajustado");
    load();
  }

  async function makeAffiliate() {
    if (!affTarget.trim()) return;
    try {
      const { data } = await adminCreateAffiliate({
        emailOrUsername: affTarget.trim(),
      });
      setMsg(`Afiliado criado — código ${data.code}`);
      setAffTarget("");
      load();
    } catch (e: any) {
      setError(e.response?.data?.error || "Falha ao criar afiliado");
    }
  }

  async function openAffiliate(userId: string) {
    try {
      const { data } = await adminAffiliateDetail(userId);
      setAffiliateDetail(data);
    } catch (e: any) {
      setError(e.response?.data?.error || "Erro ao abrir afiliado");
    }
  }

  async function saveConfig() {
    if (!config) return;
    try {
      const { data } = await adminUpdateConfig({
        houseEdge: Number(config.houseEdge),
        pointsPerUnit: Number(config.pointsPerUnit),
        maxMultiplier: Number(config.maxMultiplier),
        minBet: Number(config.minBet),
        maxBet: Number(config.maxBet),
      });
      setConfig(data);
      setMsg("Config salva");
    } catch (e: any) {
      setError(e.response?.data?.error || "Erro ao salvar config");
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Visão geral" },
    { id: "users", label: "Usuários" },
    { id: "affiliates", label: "Afiliados" },
    { id: "config", label: "Casa / RTP" },
    { id: "audit", label: "Audit" },
  ];

  return (
    <div style={{ width: "100%", maxWidth: 1040 }}>
      <h1 style={{ marginBottom: 8 }}>Painel Admin</h1>
      <p style={{ color: "#888", marginBottom: 16, fontSize: 13 }}>
        Operação da casa · afiliados · limites de aposta
      </p>
      {error && <p style={{ color: "#e94560" }}>{error}</p>}
      {msg && <p style={{ color: "#2ecc71" }}>{msg}</p>}

      <div style={styles.tabs}>
        {tabs.map((t) => (
          <button
            key={t.id}
            style={{
              ...styles.tab,
              background: tab === t.id ? "#e94560" : "#1a1a2e",
            }}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && stats && (
        <div style={styles.grid}>
          <Card title="Usuários" value={stats.users} />
          <Card title="Sessões ativas" value={stats.activeSessions} />
          <Card title="Volume apostas" value={`R$ ${Number(stats.totalBetVolume).toFixed(2)}`} />
          <Card title="Volume prêmios" value={`R$ ${Number(stats.totalWinVolume || 0).toFixed(2)}`} />
          <Card title="Lucro da casa" value={`R$ ${Number(stats.houseProfit || 0).toFixed(2)}`} />
          <Card title="Saldo jogadores" value={`R$ ${Number(stats.totalPlayerBalance || 0).toFixed(2)}`} />
          <Card title="Afiliados ativos" value={stats.activeAffiliates || 0} />
          <Card title="Saques pendentes" value={stats.pendingWithdrawals} />
        </div>
      )}

      {tab === "users" && (
        <>
          <div style={{ display: "flex", gap: 8, margin: "16px 0" }}>
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
                        Saldo
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "affiliates" && (
        <>
          <div style={{ display: "flex", gap: 8, margin: "16px 0" }}>
            <input
              value={affTarget}
              onChange={(e) => setAffTarget(e.target.value)}
              placeholder="Email ou username para tornar afiliado"
              style={styles.input}
            />
            <button style={styles.btn} onClick={makeAffiliate}>
              Criar afiliado
            </button>
          </div>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Afiliado</th>
                <th>Código</th>
                <th>Convites</th>
                <th>Volume</th>
                <th>Comissão</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {affiliates.map((a) => (
                <tr key={a.id}>
                  <td>
                    {a.user?.username}
                    <div style={{ color: "#888", fontSize: 12 }}>{a.user?.email}</div>
                  </td>
                  <td>
                    <code>{a.code}</code>
                  </td>
                  <td>{a.totalReferrals}</td>
                  <td>R$ {Number(a.totalWagered).toFixed(2)}</td>
                  <td>
                    {(Number(a.commissionRate) * 100).toFixed(1)}% · R${" "}
                    {Number(a.totalCommission).toFixed(2)}
                  </td>
                  <td>
                    <button
                      style={styles.btnSmall}
                      onClick={() => openAffiliate(a.userId)}
                    >
                      Detalhe
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {affiliateDetail && (
            <div style={{ marginTop: 24, ...styles.card }}>
              <h3>
                Detalhe · {affiliateDetail.profile?.user?.username} ({
                  affiliateDetail.profile?.code
                })
              </h3>
              <p style={{ color: "#888", fontSize: 13 }}>
                Volume indicado: R${" "}
                {Number(affiliateDetail.referredWagerVolume || 0).toFixed(2)}
              </p>
              <ul style={{ listStyle: "none", padding: 0 }}>
                {(affiliateDetail.referrals || []).map((r: any) => (
                  <li key={r.id} style={styles.auditItem}>
                    <strong>{r.username}</strong> · R$ {Number(r.balance).toFixed(2)} ·{" "}
                    {r.sessionsCount} jogos ·{" "}
                    {new Date(r.createdAt).toLocaleDateString()}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {tab === "config" && config && (
        <div style={{ maxWidth: 420, marginTop: 16 }}>
          {(
            [
              ["houseEdge", "House edge (0–0.5)"],
              ["pointsPerUnit", "Pontos por 1x da aposta"],
              ["maxMultiplier", "Multiplicador máximo"],
              ["minBet", "Aposta mínima"],
              ["maxBet", "Aposta máxima"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} style={{ display: "block", marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: "#aaa" }}>{label}</span>
              <input
                type="number"
                step="any"
                value={config[key]}
                onChange={(e) =>
                  setConfig({ ...config, [key]: e.target.value })
                }
                style={{ ...styles.input, marginTop: 4 }}
              />
            </label>
          ))}
          <button style={styles.btn} onClick={saveConfig}>
            Salvar config
          </button>
        </div>
      )}

      {tab === "audit" && (
        <ul style={{ listStyle: "none", padding: 0, marginTop: 16 }}>
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
      )}
    </div>
  );
}

function Card({ title, value }: { title: string; value: number | string }) {
  return (
    <div style={styles.card}>
      <div style={{ color: "#888", fontSize: 12 }}>{title}</div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  tabs: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 },
  tab: {
    border: "none",
    color: "#fff",
    padding: "8px 14px",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
  },
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
    width: "100%",
    boxSizing: "border-box",
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
