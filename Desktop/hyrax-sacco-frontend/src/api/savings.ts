import API from "./auth";

export const depositSavings = (data: {
  amount: number;
  channel: string;
  reference?: string;
}) => API.post("/savings/deposit", data);

export const getSavingsBalance = () => API.get("/savings/balance");
export const getSavingsHistory = () => API.get("/savings/history");
