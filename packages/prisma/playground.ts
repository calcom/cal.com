import prisma from ".";

async function main() {
  const ids = ["role", "3288dd12-b14f-4de4-996b-da68e9205fd0"];

  const result = (
    await prisma.attribute.findMany({
      select: {
        id: true,
      },
      where: {
        id: {
          in: ids,
        },
        type: "NUMBER",
      },
    })
  ).map((item) => item.id);

  console.log("💡 result", JSON.stringify(result, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
