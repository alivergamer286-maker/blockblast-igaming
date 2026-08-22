import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../services/api";
import { useAuthStore } from "../store/authStore";

export default function LoginPage() {
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await login(emailOrUsername, password);
      setAuth(data.user, data.token);
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.error || "Erro ao entrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 className="pixel" style={styles.title}>
          BLOCK<span style={{ color: "#e94560" }}>BLAST</span>
        </h1>
        <p style={styles.subtitle}>iGaming Platform</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            style={styles.input}
            placeholder="Email ou usuário"
            value={emailOrUsername}
            onChange={(e) => setEmailOrUsername(e.target.value)}
            required
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p style={styles.error}>{error}</p>}
          <button style={styles.btn} disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p style={styles.footer}>
          Não tem conta?{" "}
          <Link to="/register" style={{ color: "#e94560" }}>
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "radial-gradient(ellipse at center, #1a1a2e 0%, #0f0f1a 70%)",
    padding: 16,
  },
  card: {
    background: "#1a1a2e",
    borderRadius: 16,
    padding: "40px 32px",
    width: "100%",
    maxWidth: 400,
    boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
    border: "1px solid #2a2a40",
  },
  title: {
    fontSize: 22,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    textAlign: "center",
    color: "#a0a0b0",
    marginBottom: 32,
    fontSize: 14,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  input: {
    background: "#0f0f1a",
    border: "1px solid #2a2a40",
    borderRadius: 10,
    padding: "14px 16px",
    color: "#eaeaea",
    fontSize: 15,
  },
  btn: {
    background: "linear-gradient(135deg, #e94560, #c23152)",
    color: "#fff",
    borderRadius: 10,
    padding: "14px",
    fontWeight: 700,
    fontSize: 15,
    marginTop: 8,
  },
  error: {
    color: "#e74c3c",
    fontSize: 13,
    textAlign: "center",
  },
  footer: {
    textAlign: "center",
    marginTop: 24,
    color: "#a0a0b0",
    fontSize: 14,
  },
};
