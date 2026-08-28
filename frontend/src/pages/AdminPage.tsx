import { useEffect, useState } from "react";
import {
  adminStats,
  adminUsers,
  adminSetStatus,
  adminAdjustBalance,
  adminSetUserEconomy,
  adminAudit,
  adminAffiliates,
  adminCreateAffiliate,
  adminAffiliateDetail,
  adminGetConfig,
  adminUpdateConfig,
  adminWithdrawals,
  adminReviewWithdrawal,
  adminEvents,
  adminCreateEvent,
  adminUpdateEvent,
  adminDeleteEvent,
} from "../services/api";

type Tab =
  | "overview"
  | "users"
  | "withdrawals"
  | "events"
  | "affiliates"
  | "config"
  | "audit";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [affiliateDetail, setAffiliateDetail] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [audit, setAudit] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [affTarget, setAffTarget] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [evTitle, setEvTitle] = useState("");
  const [evMult, setEvMult] = useState("1.5");
  const [evEnd, setEvEnd] = useState("");

  async function load() {
    try {
      setError("");
      const [s, u, a, aff, cfg, w, ev] = await Promise.all([
        adminStats(),
        adminUsers(1, search),
        adminAudit(1),
        adminAffiliates(1),
        adminGetConfig(),
        adminWithdrawals("pending", 1),
        adminEvents(),
      ]);
      setStats(s.data);
      setUsers(u.data.items || []);
      setAudit(a.data.items || []);
      setAffiliates(aff.data.items || []);
      setConfig(cfg.data);
      setWithdrawals(w.data.items || []);
      setEvents(ev.data.items || []);
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || "Erro ao carregar");
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

  async function setReturn(id: string) {
    const v = prompt("% que volta pro jogador (ex: 20). Vazio = global");
    if (v === null) return;
    const pct = v.trim() === "" ? null : Number(v);
    await adminSetUserEconomy(id, { playerReturnPct: pct });
    setMsg("Retorno da conta atualizado");
    load();
  }

  async function setEngagement(id: string) {
    const mode = prompt(
      "Modo: off | auto | force_hook | force_tight",
      "auto"
    );
    if (!mode) return;
    await adminSetUserEconomy(id, { engagementMode: mode });
    setMsg("Engajamento atualizado");
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
      setError(e.response?.data?.error || "Erro");
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
        returnCap: Number(config.returnCap),
        playerReturnPct: Number(config.playerReturnPct),
        engagementEnabled: Boolean(config.engagementEnabled),
        engagementHookGames: Number(config.engagementHookGames),
        engagementHookPct: Number(config.engagementHookPct),
        engagementTightPct: Number(config.engagementTightPct),
      });
      setConfig(data);
      setMsg("Config salva");
    } catch (e: any) {
      setError(e.response?.data?.error || "Erro ao salvar");
    }
  }

  async function createEvent() {
    if (!evTitle || !evEnd) return;
    try {
      await adminCreateEvent({
        title: evTitle,
        multiplier: Number(evMult) || 1.5,
        startsAt: new Date().toISOString(),
        endsAt: new Date(evEnd).toISOString(),
        active: true,
      });
      setEvTitle("");
      setMsg("Evento criado");
      load();
    } catch (e: any) {
      setError(e.response?.data?.error || "Erro evento");
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Visão geral" },
    { id: "users", label: "Usuários" },
    { id: "withdrawals", label: "Saques" },
    { id: "events", label: "Eventos" },
    { id: "affiliates", label: "Afiliados" },
    { id: "config", label: "Casa / %" },
    { id: "audit", label: "Audit" },
  ];

  return (
    <div style={{ width: "100%", maxWidth: 1100 }}>
      <h1 style={{ marginBottom: 8 }}>Painel</h1>
      <p style={{ color: "#888", marginBottom: 16, fontSize: 13 }}>
        operação · retorno · eventos · saques
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
          <Card title="Sessões" value={stats.activeSessions} />
          <Card title="Apostas" value={`R$ ${Number(stats.totalBetVolume).toFixed(2)}`} />
          <Card title="Prêmios" value={`R$ ${Number(stats.totalWinVolume || 0).toFixed(2)}`} />
          <Card title="Lucro casa" value={`R$ ${Number(stats.houseProfit || 0).toFixed(2)}`} />
          <Card title="Saques pend." value={stats.pendingWithdrawals} />
        </div>
      )}

      {tab === "users" && (
        <>
          <div style={{ display: "flex", gap: 8, margin: "16px 0" }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar"
              style={styles.input}
            />
            <button style={styles.btn} onClick={load}>
              Buscar
            </button>
          </div>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>User</th>
                <th>Saldo</th>
                <th>% retorno</th>
                <th>Engaj.</th>
                <th>Jogos</th>
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
                  <td>
                    {u.playerReturnPct != null ? `${u.playerReturnPct}%` : "global"}
                  </td>
                  <td>{u.engagementMode || "off"}</td>
                  <td>{u.gamesPlayed ?? 0}</td>
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
                    <button style={styles.btnSmall} onClick={() => setReturn(u.id)}>
                      %
                    </button>
                    <button style={styles.btnSmall} onClick={() => setEngagement(u.id)}>
                      Modo
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {tab === "withdrawals" && (
        <table style={{ ...styles.table, marginTop: 16 }}>
          <thead>
            <tr>
              <th>User</th>
              <th>Valor</th>
              <th>CPF</th>
              <th>PIX</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {withdrawals.map((w) => (
              <tr key={w.id}>
                <td>{w.user?.username}</td>
                <td>R$ {Number(w.amount).toFixed(2)}</td>
                <td>{w.cpf}</td>
                <td>{w.pixKey}</td>
                <td>{w.status}</td>
                <td style={{ display: "flex", gap: 6 }}>
                  <button
                    style={styles.btnSmall}
                    onClick={async () => {
                      await adminReviewWithdrawal(w.id, "approved");
                      load();
                    }}
                  >
                    Aprovar
                  </button>
                  <button
                    style={styles.btnDanger}
                    onClick={async () => {
                      await adminReviewWithdrawal(w.id, "rejected");
                      load();
                    }}
                  >
                    Recusar
                  </button>
                  <button
                    style={styles.btnSmall}
                    onClick={async () => {
                      await adminReviewWithdrawal(w.id, "paid");
                      load();
                    }}
                  >
                    Pago
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === "events" && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            <input
              placeholder="Título"
              value={evTitle}
              onChange={(e) => setEvTitle(e.target.value)}
              style={styles.input}
            />
            <input
              placeholder="Multi (1.5)"
              value={evMult}
              onChange={(e) => setEvMult(e.target.value)}
              style={{ ...styles.input, maxWidth: 100 }}
            />
            <input
              type="datetime-local"
              value={evEnd}
              onChange={(e) => setEvEnd(e.target.value)}
              style={styles.input}
            />
            <button style={styles.btn} onClick={createEvent}>
              Criar evento
            </button>
          </div>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Título</th>
                <th>Multi</th>
                <th>Fim</th>
                <th>Ativo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td>{e.title}</td>
                  <td>{e.multiplier}x</td>
                  <td>{new Date(e.endsAt).toLocaleString()}</td>
                  <td>{e.active ? "sim" : "não"}</td>
                  <td style={{ display: "flex", gap: 6 }}>
                    <button
                      style={styles.btnSmall}
                      onClick={async () => {
                        await adminUpdateEvent(e.id, { active: !e.active });
                        load();
                      }}
                    >
                      {e.active ? "Pausar" : "Ativar"}
                    </button>
                    <button
                      style={styles.btnDanger}
                      onClick={async () => {
                        await adminDeleteEvent(e.id);
                        load();
                      }}
                    >
                      Apagar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "affiliates" && (
        <>
          <div style={{ display: "flex", gap: 8, margin: "16px 0" }}>
            <input
              value={affTarget}
              onChange={(e) => setAffTarget(e.target.value)}
              placeholder="Email ou username"
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
                <th></th>
              </tr>
            </thead>
            <tbody>
              {affiliates.map((a) => (
                <tr key={a.id}>
                  <td>{a.user?.username}</td>
                  <td>
                    <code>{a.code}</code>
                  </td>
                  <td>{a.totalReferrals}</td>
                  <td>R$ {Number(a.totalWagered).toFixed(2)}</td>
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
            <div style={{ marginTop: 16, ...styles.card }}>
              <h3>{affiliateDetail.profile?.code}</h3>
              {(affiliateDetail.referrals || []).map((r: any) => (
                <div key={r.id} style={styles.auditItem}>
                  {r.username} · {r.sessionsCount} jogos
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "config" && config && (
        <div style={{ maxWidth: 480, marginTop: 16 }}>
          <p style={{ color: "#aaa", fontSize: 13, marginBottom: 12 }}>
            <strong>playerReturnPct</strong>: % da stake que pode voltar pro jogador.
            Ex: 20 → aposta R$20 · máx R$4 de volta.
          </p>
          {(
            [
              ["playerReturnPct", "% que volta pro jogador (global)"],
              ["houseEdge", "House edge (0–0.5)"],
              ["returnCap", "Teto extra (múltiplo da stake)"],
              ["pointsPerUnit", "Pontos por 1x"],
              ["maxMultiplier", "Multi máx"],
              ["minBet", "Aposta mín"],
              ["maxBet", "Aposta máx"],
              ["engagementHookGames", "Jogos no modo generoso"],
              ["engagementHookPct", "% no modo generoso"],
              ["engagementTightPct", "% depois (aperto)"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} style={{ display: "block", marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: "#aaa" }}>{label}</span>
              <input
                type="number"
                step="any"
                value={config[key] ?? ""}
                onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
                style={{ ...styles.input, marginTop: 4 }}
              />
            </label>
          ))}
          <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
            <input
              type="checkbox"
              checked={Boolean(config.engagementEnabled)}
              onChange={(e) =>
                setConfig({ ...config, engagementEnabled: e.target.checked })
              }
            />
            <span style={{ fontSize: 13 }}>Engajamento automático global</span>
          </label>
          <button style={styles.btn} onClick={saveConfig}>
            Salvar
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
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  auditItem: {
    padding: "8px 0",
    borderBottom: "1px solid #2a2a40",
    fontSize: 13,
  },
};
