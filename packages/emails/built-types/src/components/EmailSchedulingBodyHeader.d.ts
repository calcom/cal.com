import type { CSSProperties } from "react";
export type BodyHeadType = "checkCircle" | "xCircle" | "calendarCircle" | "teamCircle";
export declare const getHeadImage: (headerType: BodyHeadType) => string;
declare const EmailSchedulingBodyHeader: (props: {
    headerType: BodyHeadType;
    headStyles?: CSSProperties;
}) => JSX.Element;
export default EmailSchedulingBodyHeader;
//# sourceMappingURL=EmailSchedulingBodyHeader.d.ts.map