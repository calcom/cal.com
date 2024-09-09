/// <reference types="react" />
import type { ITimezoneOption, ITimezone, Props as SelectProps } from "react-timezone-select";
export interface ICity {
    city: string;
    timezone: string;
}
export type TimezoneSelectProps = SelectProps & {
    variant?: "default" | "minimal";
    timezoneSelectCustomClassname?: string;
};
export declare function TimezoneSelect(props: TimezoneSelectProps): JSX.Element;
export type TimezoneSelectComponentProps = SelectProps & {
    variant?: "default" | "minimal";
    isPending: boolean;
    data: ICity[] | undefined;
    timezoneSelectCustomClassname?: string;
};
export declare function TimezoneSelectComponent({ className, classNames: timezoneClassNames, timezoneSelectCustomClassname, components, variant, data, isPending, value, ...props }: TimezoneSelectComponentProps): JSX.Element;
export type { ITimezone, ITimezoneOption };
//# sourceMappingURL=TimezoneSelect.d.ts.map