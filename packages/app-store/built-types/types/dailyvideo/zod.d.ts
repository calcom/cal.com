import { z } from "zod";
export declare const appKeysSchema: z.ZodObject<{
    api_key: z.ZodString;
    scale_plan: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    api_key: string;
    scale_plan: string;
}, {
    api_key: string;
    scale_plan?: string | undefined;
}>;
export declare const appDataSchema: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
export declare const ZSubmitBatchProcessorJobRes: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export type TSubmitBatchProcessorJobRes = z.infer<typeof ZSubmitBatchProcessorJobRes>;
export type batchProcessorBody = {
    preset: "transcript";
    inParams: {
        sourceType: "recordingId";
        recordingId: string;
    };
    outParams: {
        s3Config: {
            s3KeyTemplate: "transcript";
        };
    };
};
export declare const ZGetTranscriptAccessLink: z.ZodObject<{
    id: z.ZodString;
    preset: z.ZodString;
    status: z.ZodString;
    transcription: z.ZodArray<z.ZodObject<{
        format: z.ZodString;
        link: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        format: string;
        link: string;
    }, {
        format: string;
        link: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    status: string;
    id: string;
    preset: string;
    transcription: {
        format: string;
        link: string;
    }[];
}, {
    status: string;
    id: string;
    preset: string;
    transcription: {
        format: string;
        link: string;
    }[];
}>;
export type TGetTranscriptAccessLink = z.infer<typeof ZGetTranscriptAccessLink>;
//# sourceMappingURL=zod.d.ts.map