import React from "react";

export type GetAppData = (key: string) => any;
export type SetAppData = (key: string, value: any) => void;

const EventTypeAppContext = React.createContext<[GetAppData, SetAppData]>([() => ({}), () => {}]);
export default EventTypeAppContext;
