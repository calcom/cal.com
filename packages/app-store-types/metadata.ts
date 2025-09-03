import type { AppCategories } from "@prisma/client";

export type LocationOption = {
  label: string;
  value: string;
  icon?: string;
  disabled?: boolean;
};

export type CredentialDataWithTeamName = {
  id: number;
  type: string;
  key: any;
  userId: number | null;
  user: { email: string } | null;
  teamId: number | null;
  appId: string | null;
  invalid: boolean | null;
  delegatedTo: any;
  delegatedToId?: string | null | undefined;
  delegationCredentialId: string | null;
  team?: {
    name: string;
  } | null;
};

export type TDependencyData = {
  name?: string;
  installed?: boolean;
}[];

export const defaultVideoAppCategories: AppCategories[] = ["messaging", "conferencing", "video"];
