/// <reference types="react" />
import type { TFunction } from "next-i18next";
import { V2BaseEmailHtml } from "../components";
interface DailyVideoDownloadRecordingEmailProps {
    language: TFunction;
    downloadLink: string;
    title: string;
    date: string;
    name: string;
}
export declare const DailyVideoDownloadRecordingEmail: (props: DailyVideoDownloadRecordingEmailProps & Partial<React.ComponentProps<typeof V2BaseEmailHtml>>) => JSX.Element;
export {};
//# sourceMappingURL=DailyVideoDownloadRecordingEmail.d.ts.map