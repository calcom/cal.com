import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import process from "node:process";

type KeyringName = "CREDENTIALS";

type SecretEnvelopeV1 = {
  v: 1;
  alg: "AES-256-GCM";
  ring: KeyringName;
  kid: string;
  nonce: string;
  ct: string;
  tag: string;
};

type AAD = Record<string, string | number | boolean | null> | Array<string | number | boolean | null>;

function stableJson(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value !== "object") return JSON.stringify(value);

  if (Array.isArray(value)) {
    return `[${value.map((v) => stableJson(v)).join(",")}]`;
  }

  const keys = Object.keys(value).sort();
  const entries = keys.map(
    (k) => `${JSON.stringify(k)}:${stableJson((value as Record<string, unknown>)[k])}`
  );
  return `{${entries.join(",")}}`;
}

function aadToBuffer(aad: AAD): Buffer {
  const stable = stableJson(aad);
  return Buffer.from(stable, "utf8");
}

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function unb64url(s: string): Buffer {
  return Buffer.from(s, "base64url");
}

const envKeyringPrefix = (ring: KeyringName): string => {
  // enforce all caps ring names to match your convention (optional)
  // if you want to allow any casing, remove this check.
  if (ring !== ring.toUpperCase()) {
    throw new Error(`Keyring name must be ALL CAPS. Got: ${ring}`);
  }
  return `CALCOM_KEYRING_${ring}_`;
};

const getCurrentKid = (ring: KeyringName): string => {
  const prefix = envKeyringPrefix(ring);
  const current = process.env[`${prefix}CURRENT`];
  if (!current) throw new Error(`Missing env var ${prefix}CURRENT`);
  return current;
};

export function getKeyMaterial(ring: KeyringName, kid: string): Buffer {
  const prefix = envKeyringPrefix(ring);
  const raw = process.env[`${prefix}${kid.toUpperCase()}`]; // e.g. CALCOM_KEYRING_CREDENTIALS_K1
  if (!raw) throw new Error(`Unknown kid for ring=${ring}: missing env var ${prefix}${kid.toUpperCase()}`);

  const key = Buffer.from(raw, "base64url");
  if (key.length !== 32) {
    throw new Error(`Invalid key length for ring=${ring} kid=${kid}. Expected 32 bytes, got ${key.length}`);
  }
  return key;
}

export const encryptSecret = ({
  ring,
  plaintext,
  aad,
}: {
  ring: KeyringName;
  plaintext: string;
  aad: AAD;
}): SecretEnvelopeV1 => {
  const kid = getCurrentKid(ring);
  const key = getKeyMaterial(ring, kid);

  const nonce = randomBytes(12); // 96-bit nonce for GCM
  const aadBuf = aadToBuffer(aad);

  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  cipher.setAAD(aadBuf);

  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    v: 1,
    alg: "AES-256-GCM",
    ring,
    kid,
    nonce: b64url(nonce),
    ct: b64url(ct),
    tag: b64url(tag),
  };
};

export const decryptSecret = ({ envelope, aad }: { envelope: SecretEnvelopeV1; aad: AAD }): string => {
  if (envelope.v !== 1) {
    throw new Error(`Unsupported envelope version: ${envelope.v}`);
  }
  if (envelope.alg !== "AES-256-GCM") {
    throw new Error(`Unsupported envelope algorithm: ${envelope.alg}`);
  }

  const key = getKeyMaterial(envelope.ring, envelope.kid);
  const nonce = unb64url(envelope.nonce);
  const ct = unb64url(envelope.ct);
  const tag = unb64url(envelope.tag);
  const aadBuf = aadToBuffer(aad);

  const decipher = createDecipheriv("aes-256-gcm", key, nonce);
  decipher.setAAD(aadBuf);
  decipher.setAuthTag(tag);

  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString("utf8");
};

export const decryptAndMaybeReencrypt = ({
  aad,
  envelope,
}: {
  envelope: SecretEnvelopeV1;
  aad: AAD;
}): { plaintext: string; updatedEnvelope: SecretEnvelopeV1 | null } => {
  const plaintext = decryptSecret({ envelope, aad });

  const currentKid = getCurrentKid(envelope.ring);
  if (envelope.kid === currentKid) {
    return { plaintext, updatedEnvelope: null };
  }

  const updatedEnvelope = encryptSecret({
    ring: envelope.ring,
    plaintext,
    aad,
  });

  return { plaintext, updatedEnvelope };
};
