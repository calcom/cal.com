export interface NewTeamFormValues {
  name: string;
  slug: string;
  avatar: string;
  members: {
    name: string | null;
    email: string;
    username: string | null;
    role: "OWNER" | "ADMIN" | "MEMBER";
    avatar: string | null;
  }[];
}
