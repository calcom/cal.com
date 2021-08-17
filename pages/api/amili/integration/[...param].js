import prisma from "../../../../lib/prisma";

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
const handler = async (req, res) => {
  // Check valid method
  if (!["DELETE"].includes(req.method)) res.status(405).json({});
  const { param } = req.query;
  console.log("param =", param);
  const [userId, credentialId] = param;

  const focusCredential = await prisma.credential.findFirst({
    where: {
      userId: +userId,
      id: +credentialId,
    },
  });

  if (!focusCredential) {
    res.status(404).json({ message: "Not found" });
  }

  await prisma.credential.delete({
    where: {
      id: +credentialId,
    },
  });

  return res.status(200).json({ focusCredential });
};

export default handler;
