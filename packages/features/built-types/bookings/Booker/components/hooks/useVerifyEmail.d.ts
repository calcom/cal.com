/// <reference types="react" />
export interface IUseVerifyEmailProps {
    email: string;
    onVerifyEmail?: () => void;
    name?: string | {
        firstName: string;
        lastname?: string;
    };
    requiresBookerEmailVerification?: boolean;
}
export type UseVerifyEmailReturnType = ReturnType<typeof useVerifyEmail>;
export declare const useVerifyEmail: ({ email, name, requiresBookerEmailVerification, onVerifyEmail, }: IUseVerifyEmailProps) => {
    handleVerifyEmail: () => void;
    isEmailVerificationModalVisible: boolean;
    setEmailVerificationModalVisible: import("react").Dispatch<import("react").SetStateAction<boolean>>;
    setVerifiedEmail: (email: string | null) => void;
    renderConfirmNotVerifyEmailButtonCond: boolean;
    isVerificationCodeSending: boolean;
};
//# sourceMappingURL=useVerifyEmail.d.ts.map