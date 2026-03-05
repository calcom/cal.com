import type { GetMeOutput } from "../../generated/types.gen";

export type Profile = NonNullable<GetMeOutput["data"]>;
