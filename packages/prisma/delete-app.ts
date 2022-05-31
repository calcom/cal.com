import prisma from ".";

require("dotenv").config({ path: "../../.env" });

async function main() {
  const appName = process.argv[2];
  try {
    await prisma.app.delete({
      where: {
        slug: appName,
      },
    });
    console.log(`Deleted app from DB: '${appName}'`);
  } catch (e) {
    if (e.code === "P2025") {
      console.log(`App '${appName}' already deleted from DB`);
      return;
    }
    throw e;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
