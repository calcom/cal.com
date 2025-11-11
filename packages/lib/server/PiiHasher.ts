// Note: avoid Node's crypto to support runtimes where it's unavailable (e.g., edge/browsers)

export interface PiiHasher {
  hash(input: string): string;
}

export class Md5PiiHasher implements PiiHasher {
  constructor(private readonly salt: string) {}
  hash(input: string) {
    // FNV-1a 64-bit implemented with BigInt, repeated twice with variant salt to get 128-bit hex
    const fnv1a64 = (str: string) => {
      // Convert to UTF-8 bytes without relying on TextEncoder/Buffer
      const data = unescape(encodeURIComponent(str));
      let hash = 0xcbf29ce484222325n; // offset basis
      const prime = 0x100000001b3n; // FNV prime
      for (let i = 0; i < data.length; i++) {
        hash ^= BigInt(data.charCodeAt(i));
        hash = (hash * prime) & 0xffffffffffffffffn; // keep 64-bit
      }
      return hash;
    };

    // Two independent 64-bit hashes to produce a stable 128-bit hex string
    const h1 = fnv1a64(`${this.salt}::a::${input}`);
    const h2 = fnv1a64(`${this.salt}::b::${input}`);
    const toHex16 = (n: bigint) => n.toString(16).padStart(16, "0");
    return `${toHex16(h1)}${toHex16(h2)}`;
  }
}

export const piiHasher: PiiHasher = new Md5PiiHasher(process.env.CALENDSO_ENCRYPTION_KEY!);

export const hashEmail = (email: string, hasher: PiiHasher = piiHasher): string => {
  const [localPart, domain] = email.split("@");
  // Simple hash function for email, can be replaced with a more complex one if needed
  return `${hasher.hash(localPart)}@${domain}`;
};
