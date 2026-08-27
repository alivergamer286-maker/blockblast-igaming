import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export const register = (
  email: string,
  username: string,
  password: string,
  referralCode?: string
) => api.post("/auth/register", { email, username, password, referralCode });

export const login = (emailOrUsername: string, password: string) =>
  api.post("/auth/login", { emailOrUsername, password });

export const resendVerification = () => api.post("/auth/resend-verification");

export const getBalance = () => api.get("/wallet");
export const getTransactions = () => api.get("/wallet/transactions");
export const requestWithdraw = (body: {
  amount: number;
  cpf: string;
  fullName: string;
  pixKey: string;
}) => api.post("/wallet/withdraw", body);

export const startGame = (betAmount = 0) =>
  api.post("/game/start", { betAmount });

export const placePiece = (
  sessionId: string,
  pieceIndex: number,
  row: number,
  col: number
) => api.post("/game/place", { sessionId, pieceIndex, row, col });

export const endGame = (sessionId: string) =>
  api.post("/game/end", { sessionId });

export const getLeaderboard = () => api.get("/leaderboard");
export const getDailyLeaderboard = () => api.get("/leaderboard/daily");
export const getHistory = () => api.get("/history");

// Ops (admin) — path not named admin
export const adminStats = () => api.get("/ops/stats");
export const adminUsers = (page = 1, search = "") =>
  api.get("/ops/users", { params: { page, search: search || undefined } });
export const adminSetStatus = (
  id: string,
  status: string,
  banReason?: string
) => api.patch(`/ops/users/${id}/status`, { status, banReason });
export const adminAdjustBalance = (
  id: string,
  amount: number,
  reason: string
) => api.post(`/ops/users/${id}/balance`, { amount, reason });
export const adminAudit = (page = 1) =>
  api.get("/ops/audit", { params: { page } });
export const adminWithdrawals = (status?: string, page = 1) =>
  api.get("/ops/withdrawals", { params: { status, page } });
export const adminReviewWithdrawal = (
  id: string,
  status: string,
  note?: string
) => api.patch(`/ops/withdrawals/${id}`, { status, note });
export const adminAffiliates = (page = 1) =>
  api.get("/ops/affiliates", { params: { page } });
export const adminCreateAffiliate = (body: {
  emailOrUsername?: string;
  userId?: string;
  commissionRate?: number;
  notes?: string;
}) => api.post("/ops/affiliates", body);
export const adminAffiliateDetail = (userId: string) =>
  api.get(`/ops/affiliates/${userId}`);
export const adminGetConfig = () => api.get("/ops/config");
export const adminUpdateConfig = (body: Record<string, number>) =>
  api.patch("/ops/config", body);
