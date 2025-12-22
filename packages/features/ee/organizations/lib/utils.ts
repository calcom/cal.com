export function extractDomainFromEmail(email: string) {
  let out = "";
  try {
    const match = email.match(/^(?:.*?:\/\/)?.*?([\w-]*(?:\.\w{2,}|\.\w{2,}\.\w{2}))(?:[/?#:]|$)/);
    out = (match && match[1]) ?? "";
  } catch { /* empty */ }
  return out.split(".")[0];
}

/**
 * Checks if an email is a company email (not a personal email provider)
 */
export function isCompanyEmail(email: string): boolean {
  // A list of popular @domains that are personal email providers
  const personalEmailProviders = [
    "gmail.com",
    "googlemail.com",
    "yahoo.com",
    "ymail.com",
    "rocketmail.com",
    "sbcglobal.net",
    "att.net",
    "outlook.com",
    "hotmail.com",
    "live.com",
    "msn.com",
    "outlook.co",
    "hotmail.co.uk",
    "aol.com",
    "icloud.com",
    "me.com",
    "mac.com",
    "mail.com",
    "email.com",
    "post.com",
    "consultant.com",
    "myself.com",
    "dr.com",
    "europe.com",
    "engineer.com",
    "asia.com",
    "usa.com",
    "protonmail.com",
    "proton.me",
    "pm.me",
    "protonmail.ch",
    "zoho.com",
    "yandex.com",
    "gmx.com",
    "gmx.de",
    "fastmail.com",
    "inbox.com",
    "hushmail.com",
    "rediffmail.com",
    "tutanota.com",
    "mail.ru",
    "qq.com",
    "163.com",
    "naver.com",
    "web.de",
    "excite.com",
    "lycos.com",
  ];

  const emailParts = email.split("@");
  if (emailParts.length < 2) return false;
  return !personalEmailProviders.includes(emailParts[1].toLowerCase());
}
