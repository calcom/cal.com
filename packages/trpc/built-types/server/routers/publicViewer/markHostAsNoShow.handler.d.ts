import type { TNoShowInputSchema } from "./markHostAsNoShow.schema";
type NoShowOptions = {
    input: TNoShowInputSchema;
};
export declare const noShowHandler: ({ input }: NoShowOptions) => Promise<{
    attendees: {
        email: string;
        noShow: boolean;
    }[];
    noShowHost: boolean;
    message: string;
}>;
export default noShowHandler;
