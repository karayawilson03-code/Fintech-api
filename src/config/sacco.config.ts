/**
 * HYRAX ACHIEVERS SACCO — Configuration
 * Nairobi, Kasarani | ~380 members
 *
 * ⚠️ Values marked TODO need confirmation from chairman.
 *    Change values HERE only — entire system updates automatically.
 */

export const SACCO_CONFIG = {
  // ── IDENTITY ──────────────────────────────────────────────────────────────
  name: "Hyrax Achievers SACCO",
  memberNumberPrefix: "HYR",
  location: "Kasarani, Nairobi",

  // ── SHARES ────────────────────────────────────────────────────────────────
  shareValueKes: 1_000, // 1 share = KES 1,000
  minimumShares: 10, // must buy at least 10 shares
  minimumShareCapitalKes: 10_000, // 10 × KES 1,000

  // ── SAVINGS ───────────────────────────────────────────────────────────────
  minimumMonthlyContributionKes: 1_100, // KES 1,100/month
  annualSavingsInterestPercent: 10, // 10% per year on savings balance

  // ── LOAN FEES (applied to ALL loan products) ──────────────────────────────
  processingFeePercent: 0.5, // 0.5% of loan amount
  insuranceFeePercent: 2.5, // 2.5% of loan amount

  // ── LOAN PRODUCTS ─────────────────────────────────────────────────────────
  loanProducts: {
    normal: {
      name: "Normal Loan",
      monthlyRatePercent: 3, // TODO: confirm with chairman
      maxMultiplierOfSavings: 3, // borrow up to 3x savings
      maxAmountKes: null, // no hard ceiling
      minMonths: 1,
      maxMonths: 12, // TODO: confirm
      requiresGuarantor: true,
    },

    schoolFees: {
      name: "School Fees Loan",
      monthlyRatePercent: 3, // TODO: confirm
      maxMultiplierOfSavings: 2,
      maxAmountKes: null,
      minMonths: 1,
      maxMonths: 9, // TODO: confirm
      requiresGuarantor: true,
    },

    development: {
      name: "Development / Car / Housing Loan",
      monthlyRatePercent: 3, // TODO: confirm
      maxMultiplierOfSavings: 4,
      maxAmountKes: null,
      minMonths: 6,
      maxMonths: 36, // TODO: confirm
      requiresGuarantor: true,
    },

    emergency: {
      name: "Emergency Loan",
      monthlyRatePercent: 3, // TODO: confirm — sometimes lower
      maxMultiplierOfSavings: 1,
      maxAmountKes: 50_000, // TODO: confirm hard ceiling
      minMonths: 1,
      maxMonths: 3, // TODO: confirm
      requiresGuarantor: false, // TODO: confirm
    },

    topUp: {
      name: "Top-Up Loan",
      monthlyRatePercent: 3, // TODO: confirm
      maxMultiplierOfSavings: null,
      repaidPortionMultiplier: 0.5, // 50% of amount already repaid
      maxAmountKes: null,
      minMonths: 1,
      maxMonths: 12, // TODO: confirm
      requiresGuarantor: true,
    },

    super: {
      name: "Super Loan",
      monthlyRatePercent: 3, // TODO: confirm — sometimes higher
      maxMultiplierOfSavings: 5,
      maxAmountKes: null,
      minMonths: 6,
      maxMonths: 48, // TODO: confirm
      requiresGuarantor: true,
    },
  },

  // ── ELIGIBILITY RULES ─────────────────────────────────────────────────────
  minimumMembershipMonthsForLoan: 3, // TODO: confirm with chairman
  maximumActiveLoansPerMember: 1, // TODO: confirm — super loan exception?
} as const;
