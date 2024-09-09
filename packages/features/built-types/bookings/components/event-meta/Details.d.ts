import React from "react";
import type { BookerEvent } from "@calcom/features/bookings/types";
import { type IconName } from "@calcom/ui";
import { EventDetailBlocks } from "../../types";
type EventDetailsPropsBase = {
    event: Pick<BookerEvent, "currency" | "price" | "locations" | "requiresConfirmation" | "recurringEvent" | "length" | "metadata" | "isDynamic">;
    className?: string;
};
type EventDetailDefaultBlock = {
    blocks?: EventDetailBlocks[];
};
type EventDetailCustomBlock = {
    blocks?: React.FC[];
    name: string;
};
type EventDetailsProps = EventDetailsPropsBase & (EventDetailDefaultBlock | EventDetailCustomBlock);
interface EventMetaProps {
    customIcon?: React.ReactNode;
    icon?: IconName;
    iconUrl?: string;
    children: React.ReactNode;
    highlight?: boolean;
    contentClassName?: string;
    className?: string;
    isDark?: boolean;
}
/**
 * Helper component that ensures the meta data of an event is
 * rendered in a consistent way — adds an icon and children (text usually).
 */
export declare const EventMetaBlock: ({ customIcon, icon, iconUrl, children, highlight, contentClassName, className, isDark, }: EventMetaProps) => JSX.Element | null;
/**
 * Component that renders event meta data in a structured way, with icons and labels.
 * The component can be configured to show only specific blocks by overriding the
 * `blocks` prop. The blocks prop takes in an array of block names, defined
 * in the `EventDetailBlocks` enum. See the `defaultEventDetailsBlocks` const
 * for the default order in which the blocks will be rendered.
 *
 * As part of the blocks array you can also decide to render a custom React Component,
 * which will then also be rendered.
 *
 * Example:
 * const MyCustomBlock = () => <div>Something nice</div>;
 * <EventDetails event={event} blocks={[EventDetailBlocks.LOCATION, MyCustomBlock]} />
 */
export declare const EventDetails: ({ event, blocks }: EventDetailsProps) => JSX.Element;
export {};
//# sourceMappingURL=Details.d.ts.map