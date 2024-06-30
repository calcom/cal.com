import slugify from "@calcom/lib/slugify";

export const getOrgUsernameFromEmail = (email: string, autoAcceptEmailDomain: string | null) => {
  const [emailUser, emailDomain = ""] = email.split("@");
  const username =
    emailDomain === autoAcceptEmailDomain
      ? slugify(emailUser)
      : slugify(`${emailUser}-${emailDomain.split(".")[0]}`);

  return username;
};
