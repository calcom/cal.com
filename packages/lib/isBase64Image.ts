/**
 * Checks if a string is a supported base64 image format
 */
export function isBase64Image(input: string | null | undefined): boolean {
  if (!input) return false;

  return (
    input.startsWith("data:image/png;base64,") ||
    input.startsWith("data:image/jpeg;base64,") ||
    input.startsWith("data:image/jpg;base64,")
  );
}
