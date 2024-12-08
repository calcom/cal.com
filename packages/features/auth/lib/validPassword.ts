export function validPassword(password: string) {
  if (password.length < 7) return false;


  if (!/\p{Lu}/u.test(password)) return false;

  if (!/\p{Ll}/u.test(password)) return false;

  if (!/\d+/.test(password)) return false;

  return true;
}
