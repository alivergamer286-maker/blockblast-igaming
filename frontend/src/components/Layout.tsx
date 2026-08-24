import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function Layout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  return (
    <div style={styles.wrapper}>
      <header style={styles.header}>
        <div style={styles.logo} className="pixel">
          BLOCK<span style={{ color: "#e94560" }}>BLAST</span>
        </div>
        <nav style={styles.nav}>
          <NavLink
            to="/"
            end
            style={({ isActive }) => ({
              ...styles.link,
              color: isActive ? "#e94560" : "#a0a0b0",
            })}
          >
            Jogar
          </NavLink>
          <NavLink
            to="/leaderboard"
            style={({ isActive }) => ({
              ...styles.link,
              color: isActive ? "#e94560" : "#a0a0b0",
            })}
          >
            Ranking
          </NavLink>
          {user?.role === "admin" && (
            <NavLink
              to="/admin"
              style={({ isActive }) => ({
                ...styles.link,
                color: isActive ? "#e94560" : "#a0a0b0",
              })}
            >
              Admin
            </NavLink>
          )}
        </nav>
        <div style={styles.userArea}>
          <div style={styles.balance}>
            <span style={{ color: "#a0a0b0", fontSize: 12 }}>Saldo</span>
            <span style={{ color: "#2ecc71", fontWeight: 700 }}>
              R$ {user?.balance?.toFixed(2) ?? "0.00"}
            </span>
          </div>
          <span style={styles.username}>{user?.username}</span>
          <button
            style={styles.logoutBtn}
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            Sair
          </button>
        </div>
      </header>
      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 24px",
    background: "#1a1a2e",
    borderBottom: "1px solid #2a2a40",
    flexWrap: "wrap",
    gap: 12,
  },
  logo: {
    fontSize: 14,
    letterSpacing: 1,
  },
  nav: {
    display: "flex",
    gap: 24,
  },
  link: {
    textDecoration: "none",
    fontWeight: 600,
    fontSize: 14,
    transition: "color 0.15s",
  },
  userArea: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  balance: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    fontSize: 14,
  },
  username: {
    color: "#eaeaea",
    fontWeight: 600,
    fontSize: 14,
  },
  logoutBtn: {
    background: "transparent",
    border: "1px solid #e94560",
    color: "#e94560",
    padding: "6px 14px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
  },
  main: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    padding: "24px 16px",
  },
};
