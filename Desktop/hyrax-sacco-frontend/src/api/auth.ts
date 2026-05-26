import axios from "axios";

const API = axios.create({
  baseURL: "https://hyrax-sacco-api.onrender.com/api",
});

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
  kraPin: string;
  employer: string;
  password: string;
  nextOfKin: NextOfKin;
}

export const loginMember = (data: LoginData) => API.post("/auth/login", data);
export const registerMember = (data: RegisterData) =>
  API.post("/auth/register", data);
