/**
 * This class is used to convert axios like response to fetch response
 */
export declare class AxiosLikeResponseToFetchResponse<T extends {
    status: number;
    statusText: string;
    data: unknown;
}> extends Response {
    body: any;
    constructor(axiomResponse: T);
    json(): Promise<T["data"]>;
}
//# sourceMappingURL=AxiosLikeResponseToFetchResponse.d.ts.map