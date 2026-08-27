import { useEffect, useState } from "react";
import { useAuthStore } from "../store/authStore";
import { adminAffiliateDetail } from "../services/api";

export default function PartnerPage() {
  const user = useAuthStore((s) => s.user);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    adminAffiliateDetail(user.id)
      .then((r) => setData(r.data))
      .catch((e) =>
        setError(e.response?.data?.error || "Perfil de afiliado indisponível")
      );
  }, [user?.id]);

  return (
    <div style={{ width: "100%", maxWidth: 720 }}>
      <h1>Área do afiliado</h1>
      {error && <p style={{ color: "#e94560" }}>{error}</p>}
      {data && (
        <>
          <p>
            Código: <strong>{data.profile?.code}</strong>
          </p>
          <p>
            Comissão:{" "}
            {(Number(data.profile?.commissionRate || 0) * 100).toFixed(1)}%
          </p>
          <p>Indicados: {data.profile?.totalReferrals}</p>
          <p>
            Volume: R$ {Number(data.profile?.totalWagered || 0).toFixed(2)}
          </p>
          <h3 style={{ marginTop: 24 }}>Indicados</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {(data.referrals || []).map((r: any) => (
              <li
                key={r.id}
                style={{
                  padding: "8px 0",
                  borderBottom: "1px solid #2a2a40",
                  fontSize: 14,
                }}
              >
                {r.username} · {r.sessionsCount} jogos · R${" "}
                {Number(r.balance).toFixed(2)}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
