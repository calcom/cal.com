import { PrismaAttributeToUserRepository } from "../../../server/repository/PrismaAttributeToUserRepository";

export const getWhereClauseForAttributeOptionsManagedByCalcom = () => {
  // Neither created nor updated by DSync
  return {
    createdByDSyncId: null,
    // An option created by Cal.com can be updated by DSync, in that case the ownership is transferred to DSync
    updatedByDSyncId: null,
  };
};

export const findAssignmentsForMember = async ({ memberId }: { memberId: number }) => {
  const assignments = await PrismaAttributeToUserRepository.findManyIncludeAttribute({ memberId });
  return assignments.map((assignment) => ({
    ...assignment,
    attributeOption: {
      ...assignment.attributeOption,
      label: assignment.attributeOption.value,
    },
  }));
};
