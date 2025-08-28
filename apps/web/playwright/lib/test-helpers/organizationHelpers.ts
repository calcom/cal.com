import { prisma } from "@calcom/prisma";

/**
 * Example usage:
 *
 * // Basic usage with default assignments
 * await createAttributes({
 *   orgId: 1,
 *   attributes: [
 *     {
 *       name: "Department",
 *       type: "SINGLE_SELECT",
 *       options: ["Engineering", "Sales", "Marketing"]
 *     }
 *   ],
 *   assignments: [
 *     {
 *       memberIndex: 0,
 *       attributeValues: {
 *         "Department": ["Engineering"]
 *       }
 *     }
 *   ]
 * });
 *
 * // Create attributes without assignments
 * await createAttributes({
 *   orgId: 1,
 *   attributes: [
 *     { name: "Bio", type: "TEXT" },
 *     { name: "Years of Experience", type: "NUMBER" }
 *   ]
 * });
 */

interface AttributeConfig {
  name: string;
  type: "SINGLE_SELECT" | "MULTI_SELECT" | "TEXT" | "NUMBER";
  options?: string[];
}

interface MemberAssignment {
  memberIndex: number;
  attributeValues: Record<string, string[]>; // attribute name -> selected values
}

interface SeedAttributesConfig {
  orgId: number;
  attributes: AttributeConfig[];
  assignments?: MemberAssignment[];
}

/**
 * Seeds attributes for an organization with configurable types, values, and assignments
 * @param config - Configuration object containing orgId, attributes, and optional assignments
 * @returns Array of created attributes with their options
 */
export async function createAttributes(config: SeedAttributesConfig) {
  const { orgId, attributes: attributeConfigs, assignments = [] } = config;

  console.log(`🎯 Seeding attributes for org ${orgId}`);

  // Check if attributes already exist
  const existingAttributes = await prisma.attribute.findMany({
    where: {
      teamId: orgId,
      name: {
        in: attributeConfigs.map((attr) => attr.name),
      },
    },
  });

  if (existingAttributes.length > 0) {
    console.log(`Skipping attributes seed, attributes already exist`);
    return;
  }

  const memberships = await prisma.membership.findMany({
    where: {
      teamId: orgId,
    },
    select: {
      id: true,
      userId: true,
    },
  });

  console.log(`🎯 Creating attributes for org ${orgId}`);

  const attributes: { id: string; name: string; options: { id: string; value: string }[] }[] = [];

  for (const attr of attributeConfigs) {
    const attribute = await prisma.attribute.create({
      data: {
        name: attr.name,
        slug: `org:${orgId}-${attr.name.toLowerCase().replace(/ /g, "-")}`,
        type: attr.type as "TEXT" | "NUMBER" | "SINGLE_SELECT" | "MULTI_SELECT",
        teamId: orgId,
        enabled: true,
        options: attr.options
          ? {
              create: attr.options.map((opt) => ({
                value: opt,
                slug: opt.toLowerCase().replace(/ /g, "-"),
              })),
            }
          : undefined,
      },
      include: {
        options: true,
      },
    });

    attributes.push({
      id: attribute.id,
      name: attribute.name,
      options: attribute.options.map((opt) => ({
        id: opt.id,
        value: opt.value,
      })),
    });

    console.log(`\t📝 Created attribute: ${attr.name}`);

    // Process assignments for this attribute
    for (const assignment of assignments) {
      const { memberIndex, attributeValues } = assignment;

      // Check if this assignment has values for the current attribute
      const valuesForAttribute = attributeValues[attr.name];
      if (!valuesForAttribute || valuesForAttribute.length === 0) {
        console.log(
          `\t\t⏭️ Skipped ${attr.name} assignment for member ${memberIndex + 1} - no values specified`
        );
        continue;
      }

      // Get the member at the specified index
      const member = memberships[memberIndex];
      if (!member) {
        console.log(`\t\t⚠️ Skipped ${attr.name} assignment - member at index ${memberIndex} not found`);
        continue;
      }

      // Find the options for the specified values
      const selectedOptions = attribute.options.filter((opt) => valuesForAttribute.includes(opt.value));

      if (selectedOptions.length === 0) {
        console.log(
          `\t\t⚠️ Skipped ${attr.name} assignment for user ${
            member.userId
          } - no matching options found for values: ${valuesForAttribute.join(", ")}`
        );
        continue;
      }

      // Create assignments for each selected option
      for (const option of selectedOptions) {
        await prisma.attributeToUser.create({
          data: {
            memberId: member.id,
            attributeOptionId: option.id,
          },
        });
      }

      const assignedValues = selectedOptions.map((opt) => opt.value);
      console.log(
        `\t\t✅ Assigned ${attr.name} [${assignedValues.map((v) => `"${v}"`).join(", ")}] to user ${
          member.userId
        } (member ${memberIndex + 1})`
      );
    }
  }

  return attributes;
}
