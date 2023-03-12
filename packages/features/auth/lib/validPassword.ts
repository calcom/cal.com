export function validPassword(password: string) {
  if (password.length < 7) return false;

  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password)) return false;

  if (!/\d+/.test(password)) return false;

  return true;
}
