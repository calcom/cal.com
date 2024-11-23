export function validPassword(password: string) {
  if (password.length < 7) return false;

  // Match uppercase characters (Unicode aware) using \p{Lu}
  if (!/\p{Lu}/u.test(password)) return false;

  // Match lowercase characters (Unicode aware) using \p{Ll}
  if (!/\p{Ll}/u.test(password)) return false;

  // Match at least one digit
  if (!/\d+/.test(password)) return false;

  return true;
}
