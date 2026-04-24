import { checkIfFreeEmailDomain } from "@calcom/features/watchlist/lib/freeEmailDomainCheck/checkIfFreeEmailDomain";
import { extractDomainFromEmail } from "@calcom/features/watchlist/lib/utils/normalization";
import dns from "dns";
import { promisify } from "util";

const resolveMx = promisify(dns.resolveMx);

export type EmailValidationResult = {
  isValid: boolean;
  isFreeEmail: boolean;
  hasMxRecords: boolean | null;
  error?: string;
};

export type EmailValidationOptions = {
  requireCorporateEmail?: boolean;
  checkMxRecords?: boolean;
};

export const DEFAULT_FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "outlook.com",
  "yahoo.com",
  "hotmail.com",
  "aol.com",
  "icloud.com",
  "mail.ru",
  "yandex.ru",
  "qq.com",
  "163.com",
  "126.com",
  "sina.com",
  "sohu.com",
  "yeah.net",
  "tom.com",
  "263.net",
  "aliyun.com",
  "foxmail.com",
  "live.com",
  "msn.com",
]);

export const isCommonFreeEmailDomain = (domain: string): boolean => {
  const normalizedDomain = domain.toLowerCase().trim();
  return DEFAULT_FREE_EMAIL_DOMAINS.has(normalizedDomain);
};

export const hasMxRecords = async (domain: string): Promise<boolean> => {
  try {
    const records = await resolveMx(domain);
    return records.length > 0;
  } catch (error) {
    return false;
  }
};

export const validateCorporateEmail = async (
  email: string,
  options: EmailValidationOptions = {}
): Promise<EmailValidationResult> => {
  const { requireCorporateEmail = false, checkMxRecords = true } = options;

  const result: EmailValidationResult = {
    isValid: true,
    isFreeEmail: false,
    hasMxRecords: null,
  };

  const domain = extractDomainFromEmail(email);

  if (!domain) {
    return {
      ...result,
      isValid: false,
      error: "Invalid email format",
    };
  }

  if (isCommonFreeEmailDomain(domain)) {
    result.isFreeEmail = true;
    if (requireCorporateEmail) {
      return {
        ...result,
        isValid: false,
        error: "corporate_email_required",
      };
    }
  }

  if (result.isFreeEmail) {
    return result;
  }

  try {
    const isFree = await checkIfFreeEmailDomain({ email });
    if (isFree) {
      result.isFreeEmail = true;
      if (requireCorporateEmail) {
        return {
          ...result,
          isValid: false,
          error: "corporate_email_required",
        };
      }
    }
  } catch (error) {
    console.error("Error checking free email domain:", error);
  }

  if (checkMxRecords && requireCorporateEmail) {
    try {
      const hasMx = await hasMxRecords(domain);
      result.hasMxRecords = hasMx;
      if (!hasMx) {
        return {
          ...result,
          isValid: false,
          error: "invalid_email_domain",
        };
      }
    } catch (error) {
      result.hasMxRecords = null;
      console.error("Error checking MX records:", error);
    }
  }

  return result;
};
