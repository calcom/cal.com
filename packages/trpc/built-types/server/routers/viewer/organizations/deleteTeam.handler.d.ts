import type { TDeleteTeamInputSchema } from "./deleteTeam.schema";
type DeleteOptions = {
    input: TDeleteTeamInputSchema;
};
export declare const deleteTeamHandler: ({ input }: DeleteOptions) => Promise<void>;
export default deleteTeamHandler;
