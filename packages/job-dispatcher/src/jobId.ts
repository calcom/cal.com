const BULLMQ_JOB_ID_SAFE_PART_REGEX = /[^a-zA-Z0-9_-]/g;
const EDGE_UNDERSCORES_REGEX = /^_+|_+$/g;

const hashPart = (value: string): string => {
  // FNV-1a 32-bit hash for compact, deterministic suffixes when sanitization mutates the part.
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
};

export const sanitizeBullmqJobIdPart = (value: string | number): string => {
  const raw = String(value);
  const sanitized = raw.replace(BULLMQ_JOB_ID_SAFE_PART_REGEX, "_").replace(EDGE_UNDERSCORES_REGEX, "");

  if (!sanitized) {
    return `empty_${hashPart(raw)}`;
  }

  if (sanitized !== raw) {
    return `${sanitized}_${hashPart(raw)}`;
  }

  return sanitized;
};

export const buildJobId = (parts: Array<string | number>): string => {
  const safeParts = parts.map(sanitizeBullmqJobIdPart);
  return safeParts.join("_");
};
