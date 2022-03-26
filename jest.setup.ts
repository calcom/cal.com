import prisma from "@calcom/prisma";

afterEach((done) => {
  prisma.$disconnect().then();
  done();
});
