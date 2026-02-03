const url = new URL(document.URL);
window.only = url.searchParams.get("only");
window.calOrigin = url.searchParams.get("calOrigin") || "http://localhost:3000";
window.calLink = url.searchParams.get("calLink");
// We ensure that email is passed as param.email and not email so that autoforwarding of params plus explicit passing of email param doesn't make it an array of emails
const emailQueryParam = url.searchParams.get("param.email");
window.params = {
  email: emailQueryParam,
  formId: url.searchParams.get("param.formId"),
  disablePrerender: url.searchParams.get("param.disablePrerender") === "true",
};

window.generateRandomHexColor = function generateRandomHexColor() {
  // Generate a random integer between 0 and 16777215 (FFFFFF in hex)
  const randomInt = Math.floor(Math.random() * 16777216);

  // Convert the integer to a hex string with 6 digits and add leading zeros if necessary
  const hexString = randomInt.toString(16).padStart(6, "0");

  // Return the hex string with a '#' prefix
  return `#${hexString}`;
};
