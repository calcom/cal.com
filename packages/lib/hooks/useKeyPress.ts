import { useState, useEffect, useRef } from "react";

export function useKeyPress(
  targetKey: string,
  ref?: RefObject<HTMLInputElement>,
  handler?: () => void
): boolean {
  const [keyPressed, setKeyPressed] = useState(false);
  const handlerRef = useRef(handler);
  const targetKeyRef = useRef(targetKey);
  handlerRef.current = handler;
  targetKeyRef.current = targetKey;

  useEffect(() => {
    const placeHolderRef = ref?.current;
    function downHandler({ key }: { key: string }) {
      if (key === targetKeyRef.current) {
        setKeyPressed(true);
        handlerRef.current?.();
      }
    }
    function upHandler({ key }: { key: string }) {
      if (key === targetKeyRef.current) {
        setKeyPressed(false);
      }
    }

    if (ref && placeHolderRef) {
      placeHolderRef.addEventListener("keydown", downHandler);
      placeHolderRef.addEventListener("keyup", upHandler);
      return () => {
        placeHolderRef.removeEventListener("keydown", downHandler);
        placeHolderRef.removeEventListener("keyup", upHandler);
      };
    } else {
      window.addEventListener("keydown", downHandler);
      window.addEventListener("keyup", upHandler);
      return () => {
        window.removeEventListener("keydown", downHandler);
        window.removeEventListener("keyup", upHandler);
      };
    }
  }, [ref]);
  return keyPressed;
}
