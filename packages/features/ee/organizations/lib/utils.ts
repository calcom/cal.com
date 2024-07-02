export function extractDomainFromEmail(email: string) {
  let out = "";
  try {
    const match = email.match(/^(?:.*?:\/\/)?.*?(?<root>[\w\-]*(?:\.\w{2,}|\.\w{2,}\.\w{2}))(?:[\/?#:]|$)/);
    out = (match && match.groups?.root) ?? "";
  } catch (ignore) {}
  return out.split(".")[0];
}
