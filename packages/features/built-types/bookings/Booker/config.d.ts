/// <reference types="react" />
import type { BookerLayout, BookerState } from "./types";
export declare const fadeInLeft: {
    variants: {
        visible: {
            opacity: number;
            x: number;
        };
        hidden: {
            opacity: number;
            x: number;
        };
    };
    initial: string;
    exit: string;
    animate: string;
    transition: {
        ease: string;
        delay: number;
    };
};
export declare const fadeInUp: {
    variants: {
        visible: {
            opacity: number;
            y: number;
        };
        hidden: {
            opacity: number;
            y: number;
        };
    };
    initial: string;
    exit: string;
    animate: string;
    transition: {
        ease: string;
        delay: number;
    };
};
export declare const fadeInRight: {
    variants: {
        visible: {
            opacity: number;
            x: number;
        };
        hidden: {
            opacity: number;
            x: number;
        };
    };
    initial: string;
    exit: string;
    animate: string;
    transition: {
        ease: string;
        delay: number;
    };
};
type ResizeAnimationConfig = {
    [key in BookerLayout]: {
        [key in BookerState | "default"]?: React.CSSProperties;
    };
};
/**
 * This configuration is used to animate the grid container for the booker.
 * The object is structured as following:
 *
 * The root property of the object: is the name of the layout
 * (mobile, month_view, week_view, column_view)
 *
 * The values of these properties are objects that define the animation for each state of the booker.
 * The animation have the same properties as you could pass to the animate prop of framer-motion:
 * @see: https://www.framer.com/motion/animation/
 */
export declare const resizeAnimationConfig: ResizeAnimationConfig;
export declare const getBookerSizeClassNames: (layout: BookerLayout, bookerState: BookerState, hideEventTypeDetails?: boolean) => (string | false)[];
/**
 * This hook returns a ref that should be set on the booker element.
 * Based on that ref this hook animates the size of the booker element with framer motion.
 * It also takes into account the prefers-reduced-motion setting, to not animate when that's set.
 */
export declare const useBookerResizeAnimation: (layout: BookerLayout, state: BookerState) => import("framer-motion").AnimationScope<any>;
/**
 * These configures the amount of days that are shown on top of the selected date.
 */
export declare const extraDaysConfig: {
    mobile: {
        desktop: number;
        tablet: number;
    };
    month_view: {
        desktop: number;
        tablet: number;
    };
    week_view: {
        desktop: number;
        tablet: number;
    };
    column_view: {
        desktop: number;
        tablet: number;
    };
};
export {};
//# sourceMappingURL=config.d.ts.map