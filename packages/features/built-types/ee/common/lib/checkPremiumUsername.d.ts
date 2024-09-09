interface ResponseUsernameApi {
    available: boolean;
    premium: boolean;
    message?: string;
    suggestion?: string;
}
export declare function checkPremiumUsername(_username: string): Promise<ResponseUsernameApi>;
export {};
//# sourceMappingURL=checkPremiumUsername.d.ts.map