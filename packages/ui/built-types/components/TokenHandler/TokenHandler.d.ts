/// <reference types="react" />
type Digit = {
    value: number;
    onChange: () => void;
};
type PropType = {
    digits: Digit[];
    digitClassName: string;
};
declare const TokenHandler: ({ digits, digitClassName }: PropType) => JSX.Element;
export default TokenHandler;
//# sourceMappingURL=TokenHandler.d.ts.map