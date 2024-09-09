/// <reference types="react" />
export type ICalendarSwitchProps = {
    title: string;
    externalId: string;
    type: string;
    isChecked: boolean;
    name: string;
    isLastItemInList?: boolean;
    destination?: boolean;
    credentialId: number;
};
declare const CalendarSwitch: (props: ICalendarSwitchProps) => JSX.Element;
export { CalendarSwitch };
//# sourceMappingURL=CalendarSwitch.d.ts.map