/**
 * Email domain typo detection for common email providers.
 */

const COMMON_DOMAINS: Record<string, { typoDomains: string[]; hint: string }> = {
  "gmail.com": {
    typoDomains: [
      "gamil.com", "gmal.com", "gmial.com", "gmaill.com", "gmail.co",
      "gmail.cm", "gmail.om", "gail.com", "gnail.com", "gmailcom.com",
    ],
    hint: "Did you mean gmail.com?",
  },
  "yahoo.com": {
    typoDomains: [
      "yaho.com", "yhaoo.com", "yahoocom.com", "yahoo.co", "yahho.com",
      "ayhoo.com", "yahooo.com", "yahu.com",
    ],
    hint: "Did you mean yahoo.com?",
  },
  "hotmail.com": {
    typoDomains: [
      "htomail.com", "hotmal.com", "hotmail.co", "hotmial.com",
      "hotmil.com", "hotmai.com", "hormail.com",
    ],
    hint: "Did you mean hotmail.com?",
  },
  "outlook.com": {
    typoDomains: [
      "outllok.com", "outlok.com", "outloo.com", "outlookcom.com",
      "outlook.co", "outlook.cm", "outllook.com",
    ],
    hint: "Did you mean outlook.com?",
  },
  "icloud.com": {
    typoDomains: ["iclod.com", "icload.com", "iclude.com", "icloudcom.com"],
    hint: "Did you mean icloud.com?",
  },
  "aol.com": {
    typoDomains: ["aol.cm", "ao.com", "al.com", "aol.co"],
    hint: "Did you mean aol.com?",
  },
  "protonmail.com": {
    typoDomains: [
      "protonmil.com", "protonmall.com", "protonmail.cm", "prontonmail.com",
    ],
    hint: "Did you mean protonmail.com?",
  },
  "mail.com": {
    typoDomains: ["mailcom.com", "mai.com", "mall.com", "mail.co"],
    hint: "Did you mean mail.com?",
  },
  "zoho.com": {
    typoDomains: ["zoho.cm", "zho.com", "zoho.co"],
    hint: "Did you mean zoho.com?",
  },
  "yandex.com": {
    typoDomains: ["yndex.com"],
    hint: "Did you mean yandex.com?",
  },
  "gmx.com": {
    typoDomains: ["gmx.co", "gmxcom.com", "gmxx.com"],
    hint: "Did you mean gmx.com?",
  },
};

const typoToCorrectMap: Map<string, { correctDomain: string; hint: string }> = new Map();
for (const [correctDomain, config] of Object.entries(COMMON_DOMAINS)) {
  for (const typo of config.typoDomains) {
    typoToCorrectMap.set(typo.toLowerCase(), { correctDomain, hint: config.hint });
  }
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Returns a typo suggestion for an email domain, or null if none detected.
 */
export function getEmailDomainSuggestion(
  email: string
): { suggestedDomain: string; hint: string } | null {
  if (!email || !email.includes("@")) return null;
  const [, domain] = email.toLowerCase().split("@");
  if (!domain) return null;

  const exactMatch = typoToCorrectMap.get(domain);
  if (exactMatch && exactMatch.correctDomain !== domain) {
    return { suggestedDomain: exactMatch.correctDomain, hint: exactMatch.hint };
  }

  let bestMatch: { domain: string; distance: number; hint: string } | null = null;
  for (const [correctDomain, config] of Object.entries(COMMON_DOMAINS)) {
    const baseCorrectDomain = correctDomain.split(".")[0];
    const baseDomain = domain.split(".")[0];
    if (baseDomain === baseCorrectDomain) continue;

    const distance = levenshteinDistance(baseDomain, baseCorrectDomain);
    const threshold = baseCorrectDomain.length <= 5 ? 2 : 3;
    if (distance <= threshold && (!bestMatch || distance < bestMatch.distance)) {
      bestMatch = { domain: correctDomain, distance, hint: config.hint };
    }
  }

  if (bestMatch) return { suggestedDomain: bestMatch.domain, hint: bestMatch.hint };
  return null;
}
