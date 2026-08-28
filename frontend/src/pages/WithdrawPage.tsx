import { useState } from "react";
import { requestWithdraw, getBalance } from "../services/api";
import { useAuthStore } from "../store/authStore";

export default function WithdrawPage() {
  const balance = useAuthStore((s) => s.user?.balance ?? 0);
  const setBalance = useAuthStore((s) => s.setBalance);
  const [amount, setAmount] = useState("");
  const [cpf, setCpf] = useState("");
  const [fullName, setFullName] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMsg("");
    setLoading(true);
    try {
      const value = Number(amount.replace(",", "."));
      await requestWithdraw({
        amount: value,
        cpf,
        fullName,
        pixKey,
      });
      setMsg("Pedido de saque enviado. Aguarde análise.");
      setAmount("");
      const bal = await getBalance();
      setBalance(bal.data.balance);
    } catch (err: any) {
      setError(err.response?.data?.error || "Falha no saque");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ width: "100%", maxWidth: 420 }}>
      <h1 style={{ marginBottom: 8 }}>Sacar</h1>
      <p style={{ color: "#888", marginBottom: 16, fontSize: 14 }}>
        saldo disponível R$ {balance.toFixed(2)}
      </p>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          placeholder="Valor"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={input}
          required
        />
        <input
          placeholder="Nome completo"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          style={input}
          required
        />
        <input
          placeholder="CPF"
          value={cpf}
          onChange={(e) => setCpf(e.target.value)}
          style={input}
          required
        />
        <input
          placeholder="Chave PIX"
          value={pixKey}
          onChange={(e) => setPixKey(e.target.value)}
          style={input}
          required
        />
        {error && <p style={{ color: "#e94560" }}>{error}</p>}
        {msg && <p style={{ color: "#2ecc71" }}>{msg}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{
            background: "#e94560",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: 14,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {loading ? "Enviando..." : "Solicitar saque"}
        </button>
      </form>
    </div>
  );
}

const input: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 8,
  border: "1px solid #2a2a40",
  background: "#12121c",
  color: "#fff",
};
