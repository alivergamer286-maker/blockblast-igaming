import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "../services/api";

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Token ausente");
      return;
    }
    api
      .get("/auth/verify-email", { params: { token } })
      .then((res) => {
        setStatus("ok");
        setMessage(res.data.message || "E-mail confirmado");
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err.response?.data?.error || "Falha na verificação");
      });
  }, [token]);

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <h1 style={{ marginTop: 0 }}>Verificação de e-mail</h1>
        {status === "loading" && <p>Confirmando...</p>}
        {status === "ok" && (
          <>
            <p style={{ color: "#2ecc71" }}>{message}</p>
            <Link to="/login" style={styles.link}>
              Ir para o login
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <p style={{ color: "#e94560" }}>{message}</p>
            <Link to="/login" style={styles.link}>
              Voltar
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  card: {
    background: "#1a1a2e",
    border: "1px solid #2a2a40",
    borderRadius: 16,
    padding: 32,
    maxWidth: 420,
    width: "100%",
  },
  link: {
    color: "#e94560",
    fontWeight: 600,
  },
};
