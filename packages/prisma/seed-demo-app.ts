import { PrismaClient } from "@calcom/prisma";

const prisma = new PrismaClient();

async function run() {
    const user = await prisma.user.findFirst({ where: { email: "admin@example.com" } });
    if (!user) {
        console.log("User not found");
        return;
    }

    // Clean up any old ones
    await prisma.oAuthClient.deleteMany({
        where: { name: "Demo Rejected App" }
    });

    const app = await prisma.oAuthClient.create({
        data: {
            name: "Demo Rejected App",
            redirectUri: "https://example.com/callback",
            logo: "https://example.com/logo.png",
            userId: user.id,
            status: "REJECTED",
            rejectionReason: "Please fix logo URL."
        }
    });
    console.log("Created rejected app:", app.clientId);
}

run().catch(console.error).finally(() => prisma.$disconnect());
