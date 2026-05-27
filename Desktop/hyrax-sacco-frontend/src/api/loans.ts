import API from "./auth";

export const applyLoan = (data: {
  product: string;
  amount: number;
  months: number;
  purpose: string;
  guarantorIds: string[];
}) => API.post("/loans", data);

export const getMyLoans = () => API.get("/loans");
export const repayLoan = (
  loanId: string,
  data: {
    amount: number;
    channel: string;
    reference?: string;
  },
) => API.post(`/loans/${loanId}/repay`, data);
export const getLoanProducts = () => API.get("/loans/products");
