// Roles that must complete an emailed one-time code after their password to
// finish signing in (see authController.js login/verifyOtp). Nurses are
// deliberately excluded — they depend on the offline cached-credential
// login path, which has no connectivity to receive an email at all.
// Shared with adminController.js so user creation/edits can enforce the
// email this policy requires, instead of silently creating an admin or
// clinician account that can never complete its own login.
const OTP_REQUIRED_ROLES = ["admin", "clinician"];

module.exports = { OTP_REQUIRED_ROLES };
