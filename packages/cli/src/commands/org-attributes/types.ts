import type {
  Attribute,
  AssignOptionUserOutput,
  CreateAttributeOptionOutput,
  CreateOrganizationAttributesOutput,
  DeleteAttributeOptionOutput,
  DeleteOrganizationAttributesOutput,
  GetAllAttributeOptionOutput,
  GetOptionUserOutput,
  GetOrganizationAttributesOutput,
  GetSingleAttributeOutput,
  OptionOutput,
  UnassignOptionUserOutput,
  UpdateAttributeOptionOutput,
  UpdateOrganizationAttributesOutput,
} from "../../generated/types.gen";

export type OrgAttribute = Attribute;
export type OrgAttributeOption = OptionOutput;

export type OrgAttributeList = GetOrganizationAttributesOutput["data"];
export type OrgAttributeGetResponse = GetSingleAttributeOutput["data"];
export type OrgAttributeCreateResponse = CreateOrganizationAttributesOutput["data"];
export type OrgAttributeUpdateResponse = UpdateOrganizationAttributesOutput["data"];
export type OrgAttributeDeleteResponse = DeleteOrganizationAttributesOutput["data"];

export type OrgAttributeOptionList = GetAllAttributeOptionOutput["data"];
export type OrgAttributeOptionCreateResponse = CreateAttributeOptionOutput["data"];
export type OrgAttributeOptionUpdateResponse = UpdateAttributeOptionOutput["data"];
export type OrgAttributeOptionDeleteResponse = DeleteAttributeOptionOutput["data"];

export type OrgUserAttributeOptions = GetOptionUserOutput["data"];
export type OrgAssignOptionResponse = AssignOptionUserOutput["data"];
export type OrgUnassignOptionResponse = UnassignOptionUserOutput["data"];
