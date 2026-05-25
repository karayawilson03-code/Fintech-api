// Generate unique member number e.g. HYR-2026-0001
export const generateMemberNumber = (count: number): string => {
  const year = new Date().getFullYear();
  const padded = String(count).padStart(4, "0");
  return `HYR-${year}-${padded}`;
};

// Calculate loan interest
export const calculateInterest = (
  principal: number,
  ratePercent: number,
  months: number,
): number => {
  return (principal * ratePercent * months) / 100;
};

// Calculate total loan repayment
export const calculateTotalRepayment = (
  principal: number,
  ratePercent: number,
  months: number,
): number => {
  const interest = calculateInterest(principal, ratePercent, months);
  return principal + interest;
};

// Calculate monthly installment
export const calculateMonthlyInstallment = (
  principal: number,
  ratePercent: number,
  months: number,
): number => {
  const total = calculateTotalRepayment(principal, ratePercent, months);
  return total / months;
};

// Format currency in KES
export const formatCurrency = (amount: number): string => {
  return `KES ${amount.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// Get due date from today
export const getDueDate = (months: number): Date => {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date;
};
