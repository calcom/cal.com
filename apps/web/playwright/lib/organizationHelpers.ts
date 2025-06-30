import { prisma } from "@calcom/prisma";

/**
 * Seeds mock attributes for an organization with predefined types and values
 * @param orgId - The organization team ID
 * @returns Array of created attributes with their options
 */
export async function seedOrganizationAttributes(orgId: number) {
  console.log(`🎯 Seeding attributes for org ${orgId}`);
  const mockAttributes = [
    {
      name: "Department",
      type: "SINGLE_SELECT",
      options: ["Engineering", "Sales", "Marketing", "Product", "Design"],
    },
    {
      name: "Location",
      type: "SINGLE_SELECT",
      options: ["New York", "London", "Tokyo", "Berlin", "Remote"],
    },
    {
      name: "Skills",
      type: "MULTI_SELECT",
      options: ["JavaScript", "React", "Node.js", "Python", "Design", "Sales"],
    },
    {
      name: "Years of Experience",
      type: "NUMBER",
    },
    {
      name: "Bio",
      type: "TEXT",
    },
  ];

  // Check if attributes already exist
  const existingAttributes = await prisma.attribute.findMany({
    where: {
      teamId: orgId,
      name: {
        in: mockAttributes.map((attr) => attr.name),
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

  for (const attr of mockAttributes) {
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

    // Assign random values/options to members
    for (const member of memberships) {
      if (attr.type === "TEXT") {
        const mockText = `Sample ${attr.name.toLowerCase()} text for user ${member.userId}`;
        await prisma.attributeOption.create({
          data: {
            value: mockText,
            slug: mockText.toLowerCase().replace(/ /g, "-"),
            attribute: {
              connect: {
                id: attribute.id,
              },
            },
            assignedUsers: {
              create: {
                memberId: member.id,
              },
            },
          },
        });
      } else if (attr.type === "NUMBER") {
        const mockNumber = Math.floor(Math.random() * 10 + 1).toString();
        await prisma.attributeOption.create({
          data: {
            value: mockNumber,
            slug: mockNumber,
            attribute: {
              connect: {
                id: attribute.id,
              },
            },
            assignedUsers: {
              create: {
                memberId: member.id,
              },
            },
          },
        });
      } else if (attr.type === "SINGLE_SELECT" && attribute.options.length > 0) {
        const randomOption = attribute.options[Math.floor(Math.random() * attribute.options.length)];
        await prisma.attributeToUser.create({
          data: {
            memberId: member.id,
            attributeOptionId: randomOption.id,
          },
        });
      } else if (attr.type === "MULTI_SELECT" && attribute.options.length > 0) {
        // Assign 1-3 random options
        const numOptions = Math.floor(Math.random() * 3) + 1;
        const shuffledOptions = [...attribute.options].sort(() => Math.random() - 0.5);
        const selectedOptions = shuffledOptions.slice(0, numOptions);

        for (const option of selectedOptions) {
          await prisma.attributeToUser.create({
            data: {
              memberId: member.id,
              attributeOptionId: option.id,
            },
          });
        }
      }
    }

    console.log(`\t✅ Assigned ${attr.name} values to ${memberships.length} members`);
  }
  return attributes;
}
