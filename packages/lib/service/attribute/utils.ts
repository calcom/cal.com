/**
 * Utility functions for attribute service. Shared across server and client.
 */
import slugify from "@calcom/lib/slugify";
import { AttributeType } from "@calcom/prisma/client";

import type { AttributeOptionAssignment, BulkAttributeAssigner } from "./types";

/**
 * What is a pool?
 * There can be two pools:
 * 1. SCIM Pool - All assignments in this pool are created/updated by SCIM.
 * 2. Cal.com User Pool - All assignments in this pool are created/updated by Cal.com Users.
 */
export const isAssignmentForTheSamePool = ({
  assignment,
  updater,
}: {
  assignment: Pick<
    AttributeOptionAssignment,
    "createdByDSyncId" | "updatedByDSyncId" | "createdById" | "updatedById"
  >;
  updater: BulkAttributeAssigner;
}) => {
  if ("dsyncId" in updater) {
    // Cal.com user updated an assignment created by SCIM. It no longer belongs to the SCIM pool.
    if (assignment.updatedById) {
      return false;
    }
    // Either SCIM created the assignment or updated it
    return !!assignment.updatedByDSyncId || !!assignment.createdByDSyncId;
  }
  // SCIM neither created nor updated the assignment, it has to belong to the only left pool(i.e. Cal.com User Pool)
  return !assignment.createdByDSyncId && !assignment.updatedByDSyncId;
};

export const isAssignmentForLockedAttribute = ({
  assignment,
}: {
  assignment: {
    attributeOption: {
      attribute: {
        isLocked: boolean;
      };
    };
  };
}) => {
  return assignment.attributeOption.attribute.isLocked;
};

export const isAssignmentSame = ({
  existingAssignment,
  newOption,
}: {
  existingAssignment: { attributeOption: { label: string } };
  newOption: { label: string };
}) => {
  return existingAssignment.attributeOption.label.toLowerCase() === newOption.label.toLowerCase();
};

export const doesSupportMultipleValues = ({ attribute }: { attribute: { type: AttributeType } }) => {
  return attribute.type === AttributeType.MULTI_SELECT;
};

export const buildSlugFromValue = ({ value }: { value: string }) => {
  return slugify(value);
};

export const hasOptions = ({
  attribute,
}: {
  attribute: {
    type: AttributeType;
  };
}) => {
  return attribute.type === AttributeType.MULTI_SELECT || attribute.type === AttributeType.SINGLE_SELECT;
};

export const canSetValueBeyondOptions = ({
  attribute,
}: {
  attribute: {
    type: AttributeType;
  };
}) => {
  return !hasOptions({ attribute });
};
