import type { TrpcSessionUser } from "../../../trpc";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

const getAttributesHandler = async (_opts: GetOptions) => {
  console.log("----HIT----- getAttributesHandler");
  return {
    attributes: [
      {
        id: "1",
        name: "Skills",
        slug: "skills",
        type: "MULTI_SELECT",
        options: ["Javascript", "React", "Node", "Python", "C++", "Java"],
        enabled: true,
        usersCanEditRelation: false,
      },
      {
        id: "2",
        name: "Skills",
        slug: "skills",
        type: "MULTI_SELECT",
        options: ["Javascript", "React", "Node", "Python", "C++", "Java"],
        enabled: true,
        usersCanEditRelation: false,
      },
      {
        id: "3",
        name: "Skills",
        slug: "skills",
        type: "MULTI_SELECT",
        options: ["Javascript", "React", "Node", "Python", "C++", "Java"],
        enabled: true,
        usersCanEditRelation: false,
      },
    ],
  };
};

export default getAttributesHandler;
