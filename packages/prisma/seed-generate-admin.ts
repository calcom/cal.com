import prisma from ".";
import { createUserAndEventType } from "./seed-utils";

const args = process.argv.slice(2);

const userEmail: string = args.find((arg) => arg.startsWith("--email="))?.slice(8) || "";
const username = userEmail.split("@")[0];
console.log(userEmail);
console.log(username);

async function main() {
  await createUserAndEventType({
    user: {
      email: userEmail,
      password: "",
      username: username,
      name: `ADMIN @${userEmail}`,
      completedOnboarding: false,
      role: "ADMIN",
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
