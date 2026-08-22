import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../services/api";
import { useAuthStore } from "../store/authStore";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
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
      const { data } = await register(email, username, password);
      setAuth(data.user, data.token);
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.error || "Erro ao criar conta");
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
        <p style={styles.subtitle}>Crie sua conta e ganhe R$ 1000 de bônus</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            style={styles.input}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            style={styles.input}
            placeholder="Usuário (3-20 chars)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
            maxLength={20}
            pattern="[a-zA-Z0-9_]+"
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Senha (mín. 6)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          {error && <p style={styles.error}>{String(error)}</p>}
          <button style={styles.btn} disabled={loading}>
            {loading ? "Criando..." : "Criar conta"}
          </button>
        </form>

        <p style={styles.footer}>
          Já tem conta?{" "}
          <Link to="/login" style={{ color: "#e94560" }}>
            Entrar
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
    fontSize: 13,
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
