export type DataTableUserStorybook = {
  id: string;
  username: string;
  email: string;
  role: "admin" | "user";
};

export const dataTableDemousers: DataTableUserStorybook[] = [
  {
    id: "728ed52f",
    email: "m@example.com",
    username: "m",
    role: "admin",
  },
  {
    id: "489e1d42",
    email: "example@gmail.com",
    username: "e",
    role: "user",
  },
];
