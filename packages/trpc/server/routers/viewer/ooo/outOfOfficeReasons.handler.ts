export const outOfOfficeReasonList = async () => {
  const outOfOfficeReasons = await ctx.ctx.prisma.outOfOfficeReason.findMany({
    where: {
      enabled: true,
    },
  });

  return outOfOfficeReasons;
};
