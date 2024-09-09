/// <reference types="react" />
import type { OptionProps, SingleValueProps } from "react-select";
import type { DestinationCalendar } from "@calcom/prisma/client";
interface Props {
    onChange: (value: {
        externalId: string;
        integration: string;
    }) => void;
    isPending?: boolean;
    hidePlaceholder?: boolean;
    /** The external Id of the connected calendar */
    destinationCalendar?: DestinationCalendar | null;
    value: string | undefined;
    maxWidth?: number;
    hideAdvancedText?: boolean;
}
interface Option {
    label: string;
    value: string;
    subtitle: string;
}
export declare const SingleValueComponent: ({ ...props }: SingleValueProps<Option>) => JSX.Element;
export declare const OptionComponent: ({ ...props }: OptionProps<Option>) => JSX.Element;
declare const DestinationCalendarSelector: ({ onChange, isPending, value, hidePlaceholder, hideAdvancedText, maxWidth, }: Props) => JSX.Element | null;
export default DestinationCalendarSelector;
//# sourceMappingURL=DestinationCalendarSelector.d.ts.map