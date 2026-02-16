import axios from "axios";

export const httpClient = axios.create({
  timeout: 1200,
  headers: {
    "User-Agent": "riwlog-backend/0.1",
    "Content-Type": "application/json",
  },
});
