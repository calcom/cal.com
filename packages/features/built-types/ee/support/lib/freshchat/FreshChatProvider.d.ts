import type { ReactNode, Dispatch, SetStateAction } from "react";
type FreshChatContextType = {
    active: boolean;
    setActive: Dispatch<SetStateAction<boolean>>;
};
interface FreshChatProviderProps {
    children: ReactNode;
}
export declare const useFreshChat: () => FreshChatContextType;
export default function FreshChatProvider(props: FreshChatProviderProps): JSX.Element;
export {};
//# sourceMappingURL=FreshChatProvider.d.ts.map