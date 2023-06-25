import { StopCircle, Users } from "lucide-react";

export type DataTableUserStorybook = {
  id: string;
  username: string;
  email: string;
  role: "admin" | "user";
};

export const dataTableSelectionActions = [
  {
    label: "Add To Team",
    onClick: () => {
      console.log("Add To Team");
    },
    icon: Users,
  },
  {
    label: "Delete",
    onClick: () => {
      console.log("Delete");
    },
    icon: StopCircle,
  },
];

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
  {
    id: "7b8a6f1d-2d2d-4d29-9c1a-0a8b3f5f9d2f",
    email: "Keshawn_Schroeder@hotmail.com",
    username: "Ava_Waelchi",
    role: "user",
  },
  {
    id: "f4d9e2a3-7e3c-4d6e-8e4c-8d0d7d1c2c9b",
    email: "Jovanny_Grant@hotmail.com",
    username: "Kamren_Gerhold",
    role: "admin",
  },
  {
    id: "1b2a4b6e-5b2d-4c38-9c7e-9d5e8f9c0a6a",
    email: "Emilie.McKenzie@yahoo.com",
    username: "Lennie_Harber",
    role: "user",
  },
  {
    id: "d6f3e6e9-9c2a-4c8a-8f3c-0d63a0eaf5a5",
    email: "Jolie_Beatty@hotmail.com",
    username: "Lorenzo_Will",
    role: "admin",
  },
  {
    id: "7c1e5d1d-8b9c-4b1c-9d1b-7d9f8b5a7e3e",
    email: "Giovanny_Cruickshank@hotmail.com",
    username: "Monserrat_Lang",
    role: "user",
  },
  {
    id: "f7d8b7a2-0a5c-4f8d-9f4f-8d1a2c3e4b3e",
    email: "Lela_Haag@hotmail.com",
    username: "Eddie_Effertz",
    role: "user",
  },
  {
    id: "2f8b9c8d-1a5c-4e3d-9b7a-6c5d4e3f2b1a",
    email: "Lura_Kohler@gmail.com",
    username: "Alyce_Olson",
    role: "user",
  },
  {
    id: "d8c7b6a5-4e3d-2b1a-9c8d-1f2e3d4c5b6a",
    email: "Maurice.Koch@hotmail.com",
    username: "Jovanny_Kiehn",
    role: "admin",
  },
  {
    id: "3c2b1a5d-4e3d-8c7b-9a6f-0d1e2f3g4h5i",
    email: "Brenda_Bernhard@yahoo.com",
    username: "Aurelia_Kemmer",
    role: "user",
  },
  {
    id: "e4d3c2b1-5e4d-3c2b-1a9f-8g7h6i5j4k3l",
    email: "Lorenzo_Rippin@hotmail.com",
    username: "Waino_Lang",
    role: "admin",
  },
];
