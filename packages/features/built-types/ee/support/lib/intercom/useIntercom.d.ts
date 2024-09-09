export declare const isInterComEnabled: boolean;
export declare const useIntercom: () => {
    open: () => Promise<void>;
    boot: () => Promise<void>;
    show: (...args: any[]) => void;
    shutdown: (...args: any[]) => void;
};
export default useIntercom;
//# sourceMappingURL=useIntercom.d.ts.map