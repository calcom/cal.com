/// <reference types="react" />
import type { TFunction } from "next-i18next";
import { V2BaseEmailHtml } from "../components";
interface DailyVideoDownloadTranscriptEmailProps {
    language: TFunction;
    transcriptDownloadLinks: Array<string>;
    title: string;
    date: string;
    name: string;
}
export declare const DailyVideoDownloadTranscriptEmail: (props: DailyVideoDownloadTranscriptEmailProps & Partial<React.ComponentProps<typeof V2BaseEmailHtml>>) => JSX.Element;
export {};
//# sourceMappingURL=DailyVideoDownloadTranscriptEmail.d.ts.map