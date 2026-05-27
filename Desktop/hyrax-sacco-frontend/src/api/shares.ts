import API from "./auth";

export const buyShares = (data: {
  units: number;
  channel: string;
  reference?: string;
}) => API.post("/shares/buy", data);

export const getShareSummary = () => API.get("/shares/summary");
export const getShareHistory = () => API.get("/shares/history");
