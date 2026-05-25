// Validate Kenyan phone number
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^(?:\+254|0)[17]\d{8}$/;
  return phoneRegex.test(phone);
};

// Validate email
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate National ID (Kenya - 7 or 8 digits)
export const isValidNationalId = (id: string): boolean => {
  const idRegex = /^\d{7,8}$/;
  return idRegex.test(id);
};

// Validate KRA PIN (Kenya format)
export const isValidKraPin = (pin: string): boolean => {
  const kraRegex = /^[A-Z]\d{9}[A-Z]$/;
  return kraRegex.test(pin);
};

// Validate password strength
export const isValidPassword = (password: string): boolean => {
  // At least 8 chars, one uppercase, one number
  const passRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passRegex.test(password);
};

// Normalize phone to international format
export const normalizePhone = (phone: string): string => {
  if (phone.startsWith("0")) {
    return "+254" + phone.slice(1);
  }
  return phone;
};
