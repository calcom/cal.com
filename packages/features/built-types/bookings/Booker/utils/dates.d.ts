/// <reference types="react" />
import { TimeFormat } from "@calcom/lib/timeFormat";
interface EventFromToTime {
    date: string;
    duration: number | null;
    timeFormat: TimeFormat;
    timeZone: string;
    language: string;
}
interface EventFromTime {
    date: string;
    timeFormat: TimeFormat;
    timeZone: string;
    language: string;
}
export declare const formatEventFromTime: ({ date, timeFormat, timeZone, language }: EventFromTime) => {
    date: string;
    time: string;
};
export declare const formatEventFromToTime: ({ date, duration, timeFormat, timeZone, language, }: EventFromToTime) => {
    date: string;
    time: string;
};
export declare const FromToTime: (props: EventFromToTime) => JSX.Element;
export declare const FromTime: (props: EventFromTime) => JSX.Element;
export {};
//# sourceMappingURL=dates.d.ts.map