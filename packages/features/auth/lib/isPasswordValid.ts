export function isPasswordValid(password: string): boolean;
export function isPasswordValid(
  password: string,
  breakdown: boolean,
  strict?: boolean
): { caplow: boolean; num: boolean; min: boolean; admin_min?: boolean };
export function isPasswordValid(password: string, breakdown?: boolean, strict?: boolean) {
  let cap = false, // Has uppercase characters (ASCII or Unicode)
    low = false, // Has lowercase characters
    num = false, // At least one number
    min = false, // Meets minimum length requirement
    admin_min = false; // Stricter admin length requirement

  // Check minimum length
  if (password.length >= 7 && (!strict || password.length > 14)) min = true;
  if (strict && password.length > 14) admin_min = true;

  // Check for numbers
  if (/\d/.test(password)) num = true;

  // Check for lowercase ASCII letters
  if (/[a-z]/.test(password)) low = true;

  // Check for Unicode uppercase letters
  if (/\p{Lu}/u.test(password)) cap = true;

  // If breakdown is not requested, return a single boolean result
  if (!breakdown) {
    return cap && low && num && min && (strict ? admin_min : true);
  }

  // Construct breakdown of validation results
  let errors: Record<string, boolean> = { caplow: cap && low, num, min };

  // Only include admin_min in breakdown if strict mode is enabled
  if (strict) errors = { ...errors, admin_min };

  return errors;
}
