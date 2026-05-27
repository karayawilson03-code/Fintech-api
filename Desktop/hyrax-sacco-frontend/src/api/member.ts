import API from "./auth";

export const getDashboard = () => API.get("/members/dashboard");
export const getStatement = (from?: string, to?: string) =>
  API.get("/statements/my", { params: { from, to } });
