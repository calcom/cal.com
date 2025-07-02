export default function getAllPossibleWebsiteValuesFromEmailDomain(emailDomain: string) {
  return [
    emailDomain,
    `www.${emailDomain}`,
    `http://www.${emailDomain}`,
    `http://${emailDomain}`,
    `https://www.${emailDomain}`,
    `https://${emailDomain}`,
  ];
}
