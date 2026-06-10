export const passwordRequirements = [
  {
    id: "minimumLength",
    label: "At least 8 characters",
    test: (password) => password.length >= 8,
  },
  {
    id: "uppercase",
    label: "One uppercase letter",
    test: (password) => /[A-Z]/.test(password),
  },
  {
    id: "lowercase",
    label: "One lowercase letter",
    test: (password) => /[a-z]/.test(password),
  },
  {
    id: "number",
    label: "One number",
    test: (password) => /[0-9]/.test(password),
  },
  {
    id: "specialCharacter",
    label: "One special character",
    test: (password) => /[^A-Za-z0-9\s]/.test(password),
  },
];

/**
 * Evaluates a newly selected password without storing or logging its value.
 * The result can be reused by signup and future reset-password completion UI.
 */
export function getPasswordRequirementResults(password) {
  return passwordRequirements.map(({ id, label, test }) => ({
    id,
    label,
    isMet: test(password),
  }));
}

export function isPasswordValid(password) {
  return getPasswordRequirementResults(password).every(
    (requirement) => requirement.isMet,
  );
}
