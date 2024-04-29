import { Prisma, Service } from "@prisma/client";
import { db } from "prisma/client";
import slugify from "~/lib/utils";

const seedServices = [
  {
    name: "Haircut",
    slug: slugify("Haircut"),
    professions: {
      connectOrCreate: {
        where: {
          slug: slugify("Hair Dresser"),
        },
        create: {
          name: "Hair Dresser",
          slug: slugify("Hair Dresser"),
        },
      },
    },
  },
  {
    name: "Hair coloring",
    slug: slugify("Hair coloring"),
    professions: {
      connectOrCreate: {
        where: { slug: slugify("Hair Dresser") },
        create: { name: "Hair Dresser", slug: slugify("Hair Dresser") },
      },
    },
  },
  {
    name: "Hair styling",
    slug: slugify("Hair styling"),
    professions: {
      connectOrCreate: {
        where: { slug: slugify("Hair Dresser") },
        create: { name: "Hair Dresser", slug: slugify("Hair Dresser") },
      },
    },
  },
  {
    name: "Beard trimming",
    slug: slugify("Beard trimming"),
    professions: {
      connectOrCreate: {
        where: { slug: slugify("Hair Dresser") },
        create: { name: "Hair Dresser", slug: slugify("Hair Dresser") },
      },
    },
  },
  {
    name: "Therapy",
    slug: slugify("Therapy"),
    professions: {
      connectOrCreate: {
        where: { slug: slugify("Therapist") },
        create: { name: "Therapist", slug: slugify("Therapist") },
      },
    },
  },
  {
    name: "Skin consultation",
    slug: slugify("Skin consultation"),
    professions: {
      connectOrCreate: {
        where: { slug: slugify("Dermatologist") },
        create: { name: "Dermatologist", slug: slugify("Dermatologist") },
      },
    },
  },
  {
    name: "Nurse consultation",
    slug: slugify("Nurse consultation"),
    professions: {
      connectOrCreate: {
        where: { slug: slugify("Nurse") },
        create: { name: "Nurse", slug: slugify("Nurse") },
      },
    },
  },
  {
    name: "Cognitive Behavioral Therapy",
    slug: slugify("Cognitive Behavioral Therapy"),
    professions: {
      connectOrCreate: {
        where: { slug: slugify("Therapist") },
        create: { name: "Therapist", slug: slugify("Therapist") },
      },
    },
  },
  {
    name: "Couple therapy",
    slug: slugify("Couple therapy"),
    professions: {
      connectOrCreate: {
        where: { slug: slugify("Therapist") },
        create: { name: "Therapist", slug: slugify("Therapist") },
      },
    },
  },
  {
    name: "Graphic Design",
    slug: slugify("Graphic Design"),
    professions: {
      connectOrCreate: {
        where: { slug: slugify("Designer") },
        create: { name: "Designer", slug: slugify("Designer") },
      },
    },
  },
  {
    name: "Web Development",
    slug: slugify("Web Development"),
    professions: {
      connectOrCreate: {
        where: { slug: slugify("Software Engineer") },
        create: {
          name: "Software Engineer",
          slug: slugify("Software Engineer"),
        },
      },
    },
  },
] as const satisfies Array<Prisma.ServiceCreateInput>;

async function main() {
  const queries = [];
  for (const serviceWithProfession of seedServices) {
    const upsertArgs = {
      where: { slug: serviceWithProfession.slug },
      create: serviceWithProfession,
      update: serviceWithProfession,
    } satisfies Prisma.ServiceUpsertArgs;

    queries.push(db.service.upsert(upsertArgs));
  }
  await Promise.all(queries);
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
