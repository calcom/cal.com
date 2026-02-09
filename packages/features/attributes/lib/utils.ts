import { PrismaAttributeToUserRepository } from "@calcom/features/attributes/repositories/PrismaAttributeToUserRepository";
import prisma from "@calcom/prisma";

export const getWhereClauseForAttributeOptionsManagedByCalcom = () => {
  // Neither created nor updated by DSync
  return {
    createdByDSyncId: null,
    // An option created by Cal.com can be updated by DSync, in that case the ownership is transferred to DSync
    updatedByDSyncId: null,
  };
};

export const findAssignmentsForMember = async ({ memberId }: { memberId: number }) => {
  const attributeToUserRepo = new PrismaAttributeToUserRepository(prisma);
  const assignments = await attributeToUserRepo.findManyIncludeAttribute({ memberId });
  return assignments.map((assignment) => ({
    ...assignment,
    attributeOption: {
      ...assignment.attributeOption,
      label: assignment.attributeOption.value,
    },
  }));
};
