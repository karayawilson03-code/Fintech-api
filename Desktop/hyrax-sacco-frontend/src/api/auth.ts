import axios from "axios";

const API = axios.create({
  baseURL: "https://hyrax-sacco-api.onrender.com/api",
});

// Automatically attach token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto logout if token expires
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("member");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

interface LoginData {
  email: string;
  password: string;
}

interface NextOfKin {
  fullName: string;
  relationship: string;
  phone: string;
  nationalId: string;
}

interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nationalId: string;
  kraPin?: string;
  employer?: string;
  password: string;
  nextOfKin: NextOfKin;
}

export const loginMember = (data: LoginData) => API.post("/auth/login", data);
export const registerMember = (data: RegisterData) =>
  API.post("/auth/register", data);

export default API;
