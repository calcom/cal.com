export const getOrgWebAppUrl = (orgSlug: string, webAppUrl: string): string => {
  // Split the URL into parts based on "//" and "."
  const parts = webAppUrl.split("//");
  const domainParts = parts[1].split(".");

  // Replace "app" with the org-slug in the domain part
  domainParts[0] = orgSlug;

  return `${parts[0]}//${domainParts.join(".")}`;
};
