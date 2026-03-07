import type { GetMeOutput, UpdateMeOutput } from "../../generated/types.gen";

export type Profile = NonNullable<GetMeOutput["data"]>;
export type ProfileUpdateResponse = UpdateMeOutput["data"];
