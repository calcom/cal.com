export interface NewTeamMembersFieldArray {
  members: PendingMember[];
}

export interface NewTeamFormValues {
  name: string;
  slug: string;
  logo: string;
}

export interface PendingMember {
  name: string | null;
  email: string;
  id?: number;
  username: string | null;
  role: "OWNER" | "ADMIN" | "MEMBER";
  avatar: string | null;
  sendInviteEmail?: boolean;
}

export type NewTeamData = NewTeamFormValues & NewTeamMembersFieldArray;
