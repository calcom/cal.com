export function validPassword(password: string): boolean {
  // Ensure password is at least 7 characters long
  if (password.length < 7) return false;

  // Match uppercase Unicode letters (explicit range)
  if (!/[A-ZÅÄÖÆØÇÉÈÜÊÛÁÀÂ]/.test(password)) return false;

  // Match lowercase Unicode letters (explicit range)
  if (!/[a-zåäöæøçéèüêûáàâ]/.test(password)) return false;

  // Ensure the password contains at least one digit
  if (!/\d/.test(password)) return false;

  // If all conditions are met, return true
  return true;
}
