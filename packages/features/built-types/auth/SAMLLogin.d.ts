import type { Dispatch, SetStateAction } from "react";
interface Props {
    samlTenantID: string;
    samlProductID: string;
    setErrorMessage: Dispatch<SetStateAction<string | null>>;
}
export declare function SAMLLogin({ samlTenantID, samlProductID, setErrorMessage }: Props): JSX.Element;
export {};
//# sourceMappingURL=SAMLLogin.d.ts.map