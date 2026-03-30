export function stripCRLF(value: string): string {
  return value.replace(/[\r\n]/g, "");
}
