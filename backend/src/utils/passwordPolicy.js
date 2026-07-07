const MIN_LENGTH = 8;

/* Returns an error message string if the password fails the policy,
   or null if it passes. Kept as a single shared check so login/create/
   reset/change-password can't drift out of sync with each other. */
function validatePasswordStrength(password) {
  if (!password || password.length < MIN_LENGTH) {
    return `Password must be at least ${MIN_LENGTH} characters.`;
  }

  if (!/[A-Za-z]/.test(password)) {
    return "Password must include at least one letter.";
  }

  if (!/[0-9]/.test(password)) {
    return "Password must include at least one number.";
  }

  return null;
}

module.exports = { validatePasswordStrength, MIN_LENGTH };
