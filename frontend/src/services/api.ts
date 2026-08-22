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

export const register = (email: string, username: string, password: string) =>
  api.post("/auth/register", { email, username, password });

export const login = (emailOrUsername: string, password: string) =>
  api.post("/auth/login", { emailOrUsername, password });

export const getBalance = () => api.get("/wallet");
export const getTransactions = () => api.get("/wallet/transactions");

export const startGame = (betAmount = 0) =>
  api.post("/game/start", { betAmount });

export const placePiece = (sessionId: string, pieceIndex: number, row: number, col: number) =>
  api.post("/game/place", { sessionId, pieceIndex, row, col });

export const endGame = (sessionId: string) =>
  api.post("/game/end", { sessionId });

export const getLeaderboard = () => api.get("/leaderboard");
export const getDailyLeaderboard = () => api.get("/leaderboard/daily");
export const getHistory = () => api.get("/history");
