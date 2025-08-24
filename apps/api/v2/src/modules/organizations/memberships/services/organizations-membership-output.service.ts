import { DbOrgMembership } from "@/modules/organizations/memberships/organizations-membership.repository";
import {
  MultiSelectAttribute,
  NumberAttribute,
  OrganizationMembershipOutput,
  OrgUserAttribute,
  SingleSelectAttribute,
  TextAttribute,
} from "@/modules/organizations/memberships/outputs/organization-membership.output";
import { Injectable } from "@nestjs/common";
import { plainToClass } from "class-transformer";

import { groupMembershipAttributes } from "@calcom/platform-libraries";
import type { GroupedAttribute } from "@calcom/platform-libraries";

@Injectable()
export class OrganizationsMembershipOutputService {
  getOrgMembershipsOutput(memberships: NonNullable<DbOrgMembership>[]) {
    return memberships.map((membership) => this.getOrgMembershipOutput(membership));
  }

  getOrgMembershipOutput(organizationMembership: NonNullable<DbOrgMembership>) {
    const { AttributeToUser, ...orgMembership } = organizationMembership;

    const groupedMembershipAttributes: GroupedAttribute[] = groupMembershipAttributes(AttributeToUser);
    const attributesOutput = this.getAttributesOutput(groupedMembershipAttributes);

    return plainToClass(OrganizationMembershipOutput, { ...orgMembership, attributes: attributesOutput });
  }

  private getAttributesOutput(attributes: GroupedAttribute[]): OrgUserAttribute[] {
    return attributes.map((attribute) => {
      switch (attribute.type) {
        case "TEXT":
          return this.getTextAttributeOutput(attribute);
        case "NUMBER":
          return this.getNumberAttributeOutput(attribute);
        case "SINGLE_SELECT":
          return this.getSingleSelectAttributeOutput(attribute);
        case "MULTI_SELECT":
          return this.getMultiSelectAttributeOutput(attribute);
        default:
          return this.getTextAttributeOutput(attribute);
      }
    });
  }

  private getTextAttributeOutput(attribute: GroupedAttribute): TextAttribute {
    return {
      id: attribute.id,
      name: attribute.name,
      optionId: attribute.options[0].id,
      option: attribute.options[0].value,
      type: "text",
    };
  }

  private getNumberAttributeOutput(attribute: GroupedAttribute): NumberAttribute {
    return {
      id: attribute.id,
      name: attribute.name,
      optionId: attribute.options[0].id,
      option: +attribute.options[0].value,
      type: "number",
    };
  }

  private getSingleSelectAttributeOutput(attribute: GroupedAttribute): SingleSelectAttribute {
    return {
      id: attribute.id,
      name: attribute.name,
      optionId: attribute.options[0].id,
      option: attribute.options[0].value,
      type: "singleSelect",
    };
  }

  private getMultiSelectAttributeOutput(attribute: GroupedAttribute): MultiSelectAttribute {
    return {
      id: attribute.id,
      name: attribute.name,
      options: attribute.options.map((option: GroupedAttribute["options"][number]) => ({
        optionId: option.id,
        option: option.value,
      })),
      type: "multiSelect",
    };
  }
}
