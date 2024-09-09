import type { WithSession } from "../../createContext";
import type { TGetDownloadLinkOfCalVideoRecordingsInputSchema } from "./getDownloadLinkOfCalVideoRecordings.schema";
type GetDownloadLinkOfCalVideoRecordingsHandlerOptions = {
    ctx: WithSession;
    input: TGetDownloadLinkOfCalVideoRecordingsInputSchema;
};
export declare const getDownloadLinkOfCalVideoRecordingsHandler: ({ input, ctx, }: GetDownloadLinkOfCalVideoRecordingsHandlerOptions) => Promise<{
    download_link: string;
} | undefined>;
export {};
