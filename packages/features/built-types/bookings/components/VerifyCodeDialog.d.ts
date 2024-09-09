import type { Dispatch, SetStateAction } from "react";
export declare const VerifyCodeDialog: ({ isOpenDialog, setIsOpenDialog, email, isUserSessionRequiredToVerify, verifyCodeWithSessionNotRequired, verifyCodeWithSessionRequired, resetErrors, setIsPending, isPending, error, }: {
    isOpenDialog: boolean;
    setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
    email: string;
    isUserSessionRequiredToVerify?: boolean | undefined;
    verifyCodeWithSessionNotRequired: (code: string, email: string) => void;
    verifyCodeWithSessionRequired: (code: string, email: string) => void;
    resetErrors: () => void;
    isPending: boolean;
    setIsPending: (status: boolean) => void;
    error: string;
}) => JSX.Element;
//# sourceMappingURL=VerifyCodeDialog.d.ts.map