export const PASSWORD_HINT = "At least 8 characters, with a letter and a number";

// Mirrors backend/src/utils/passwordPolicy.js — kept in sync by hand since
// the two run in separate languages/runtimes. The server re-validates
// regardless; this is just fail-fast feedback in the form.
export function passwordPolicyError(password: string): string | null {
  if (!password || password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Za-z]/.test(password)) return "Password must include at least one letter.";
  if (!/[0-9]/.test(password)) return "Password must include at least one number.";
  return null;
}
