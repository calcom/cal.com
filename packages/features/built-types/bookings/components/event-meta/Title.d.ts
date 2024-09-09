/// <reference types="react" />
interface EventTitleProps {
    children: React.ReactNode;
    /**
     * Option to override the default h1 tag.
     */
    as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span";
    className?: string;
}
export declare const EventTitle: ({ children, as, className }: EventTitleProps) => JSX.Element;
export {};
//# sourceMappingURL=Title.d.ts.map