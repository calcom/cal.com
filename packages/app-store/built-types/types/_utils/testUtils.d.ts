export declare function generateJsonResponse({ json, status, statusText, }: {
    json: unknown;
    status?: number;
    statusText?: string;
}): Response;
export declare function internalServerErrorResponse({ json, }: {
    json: unknown;
    status?: number;
    statusText?: string;
}): Response;
export declare function generateTextResponse({ text, status, statusText, }: {
    text: string;
    status?: number;
    statusText?: string;
}): Response;
export declare function successResponse({ json }: {
    json: unknown;
}): Response;
//# sourceMappingURL=testUtils.d.ts.map