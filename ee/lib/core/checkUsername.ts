import slugify from "@lib/slugify";

export default async function checkUsername(_username: string) {
  const username = slugify(_username);
  const response = await fetch("https://cal.com/api/username", {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username }),
    method: "POST",
    mode: "cors",
  });

  return response;
}
