import slugify from "~/lib/utils";

export const getExperts = async ({
  sortKey,
  reverse,
  query,
}: {
  query?: string;
  reverse?: boolean;
  sortKey?: string;
}) => {
  // TODO: replace w/ db call using sortKey, reverse, query
  // const response = await fetch("https://jsonplaceholder.typicode.com/posts");
  // return response.json();

  // return an array of 20 results of type Expert:
  const experts = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    profession: { name: "Hair dresser", isRemote: false },
    services: [
      { name: "Haircut" },
      { name: "Hair coloring" },
      { name: "Hair styling" },
      { name: "Beard trimming" },
    ],
    image: {
      url: "https://picsum.photos/200",
      alt: "A profile picture",
    },
    location: "Berlin",
    name: "John Doe",
    email: "john@doe.com",
    username: slugify("John Doe"),
    bio: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    updatedAt: new Date(),
    availableAt: new Date(),
  }));
  // add an expert for demo purposes
  experts.push({
    id: 21,
    profession: { name: "Hair dresser", isRemote: false },
    services: [
      { name: "Haircut" },
      { name: "Hair coloring" },
      { name: "Hair styling" },
      { name: "Beard trimming" },
    ],
    image: {
      url: "https://picsum.photos/200",
      alt: "A profile picture",
    },
    location: "Berlin",
    name: "Jane Doe",
    email: "jane.doe@gmail.com",
    username: slugify("Jane Doe"),
    bio: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    updatedAt: new Date(),
    availableAt: new Date(),
  });
  return experts;
};

export type Expert = Awaited<ReturnType<typeof getExperts>>[number];
