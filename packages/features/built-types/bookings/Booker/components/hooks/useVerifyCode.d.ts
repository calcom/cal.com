/// <reference types="react" />
export type UseVerifyCodeReturnType = ReturnType<typeof useVerifyCode>;
type UseVerifyCodeProps = {
    onSuccess: (isVerified: boolean) => void;
};
export declare const useVerifyCode: ({ onSuccess }: UseVerifyCodeProps) => {
    verifyCodeWithSessionRequired: (code: string, email: string) => void;
    verifyCodeWithSessionNotRequired: (code: string, email: string) => void;
    isPending: boolean;
    setIsPending: import("react").Dispatch<import("react").SetStateAction<boolean>>;
    error: string;
    value: string;
    hasVerified: boolean;
    setValue: import("react").Dispatch<import("react").SetStateAction<string>>;
    setHasVerified: import("react").Dispatch<import("react").SetStateAction<boolean>>;
    resetErrors: () => void;
};
export {};
//# sourceMappingURL=useVerifyCode.d.ts.map