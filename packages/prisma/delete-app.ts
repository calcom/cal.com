import process from "node:process";
import prisma from ".";

// TODO: Put some restrictions here to run it on local DB only.
// Production DB currently doesn't support app deletion
async function main() {
  const appId = process.argv[2];
  try {
    await prisma.app.delete({
      where: {
        slug: appId,
      },
    });
    await prisma.credential.deleteMany({
      where: {
        appId: appId,
      },
    });
    console.log(`Deleted app from DB: '${appId}'`);
  } catch (e) {
    if (e.code === "P2025") {
      console.log(`App '${appId}' already deleted from DB`);
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
