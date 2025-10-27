export function extractDomainFromEmail(email: string) {
  let out = "";
  try {
    const match = email.match(/^(?:.*?:\/\/)?.*?([\w\-]*(?:\.\w{2,}|\.\w{2,}\.\w{2}))(?:[\/?#:]|$)/);
    out = (match && match[1]) ?? "";
  } catch (ignore) {}
  return out.split(".")[0];
}

/**
 * Checks if an email is a company email (not a personal email provider)
 */
export function isCompanyEmail(email: string): boolean {
  // A list of popular @domains that are personal email providers
  const personalEmailProviders = [
    "gmail.com",
    "yahoo.com",
    "outlook.com",
    "hotmail.com",
    "aol.com",
    "icloud.com",
    "mail.com",
    "protonmail.com",
    "proton.me",
    "zoho.com",
    "yandex.com",
    "gmx.com",
    "fastmail.com",
    "inbox.com",
    "me.com",
    "hushmail.com",
    "live.com",
    "rediffmail.com",
    "tutanota.com",
    "mail.ru",
    "usa.com",
    "qq.com",
    "163.com",
    "web.de",
    "rocketmail.com",
    "excite.com",
    "lycos.com",
    "outlook.co",
    "hotmail.co.uk",
  ];

  const emailParts = email.split("@");
  if (emailParts.length < 2) return false;
  return !personalEmailProviders.includes(emailParts[1].toLowerCase());
}
