import { useCallback, useRef, useState } from "react";
import { useEffect } from "react";
import { HexColorInput, HexColorPicker } from "react-colorful";

import { isValidHexCode, fallBackHex } from "@components/CustomBranding";
import Swatch from "@components/Swatch";

type Handler = (event: MouseEvent | Event) => void;
function useEventListener<
  KW extends keyof WindowEventMap,
  KH extends keyof HTMLElementEventMap,
  T extends HTMLElement | void = void
>(
  eventName: KW | KH,
  handler: (event: WindowEventMap[KW] | HTMLElementEventMap[KH] | Event) => void,
  element?: React.RefObject<T>
) {
  // Create a ref that stores handler
  const savedHandler = useRef<typeof handler>();
  useEffect(() => {
    // Define the listening target
    const targetElement: T | Window = element?.current || window;
    if (!(targetElement && targetElement.addEventListener)) {
      return;
    }
    // Update saved handler if necessary
    if (savedHandler.current !== handler) {
      savedHandler.current = handler;
    }
    // Create event listener that calls handler function stored in ref
    const eventListener: typeof handler = (event) => {
      // eslint-disable-next-line no-extra-boolean-cast
      if (!!savedHandler?.current) {
        savedHandler.current(event);
      }
    };
    targetElement.addEventListener(eventName, eventListener);
    // Remove event listener on cleanup
    return () => {
      targetElement.removeEventListener(eventName, eventListener);
    };
  }, [eventName, element, handler]);
}

function useOnClickOutside<T extends HTMLElement = HTMLElement>(
  ref: React.RefObject<T>,
  handler: Handler,
  mouseEvent: "mousedown" | "mouseup" = "mousedown"
): void {
  useEventListener(mouseEvent, (event) => {
    const el = ref?.current;
    // Do nothing if clicking ref's element or descendent elements
    if (!el || el.contains(event.target as Node)) {
      return;
    }
    handler(event);
  });
}
export type ColorPickerProps = {
  defaultValue: string;
  onChange: (text: string) => void;
};

const ColorPicker = (props: ColorPickerProps) => {
  const init = !isValidHexCode(props.defaultValue) ? fallBackHex(props.defaultValue) : props.defaultValue;
  const [color, setColor] = useState(init);
  const [isOpen, toggle] = useState(false);
  const popover = useRef() as React.MutableRefObject<HTMLInputElement>;
  const close = useCallback(() => toggle(false), []);
  useOnClickOutside(popover, close);
  return (
    <div className="relative mt-1 flex items-center justify-center">
      <Swatch size="sm" backgroundColor={color} onClick={() => toggle(!isOpen)} />

      {isOpen && (
        <div className="popover" ref={popover}>
          <HexColorPicker
            className="!absolute !top-10 !left-0 !z-10 !h-32 !w-32"
            color={color}
            onChange={(val) => {
              setColor(val);
              props.onChange(val);
            }}
          />
        </div>
      )}
      <HexColorInput
        className="ml-1 block w-full rounded-sm border border-gray-300 px-3 py-2 shadow-sm focus:border-neutral-800 focus:outline-none focus:ring-neutral-800 sm:text-sm"
        color={color}
        onChange={(val) => {
          setColor(val);
          props.onChange(val);
        }}
        type="text"
      />
    </div>
  );
};

export default ColorPicker;
