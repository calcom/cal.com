import slugify from "@calcom/lib/slugify";

export const getOrgUsernameFromEmail = (email: string, autoAcceptEmailDomain: string | null) => {
  const [emailUser, emailDomain = ""] = email.split("@");
  const username =
    emailDomain === autoAcceptEmailDomain
      ? slugify(emailUser)
      : slugify(`${emailUser}-${emailDomain.split(".")[0]}`);

  return username;
};

export const deriveNameFromOrgUsername = ({ username }: { username: string }) => {
  return username
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};
