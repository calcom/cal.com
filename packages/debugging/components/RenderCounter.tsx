import { useRef } from "react";

/**
 * Updates in document the number of times a component has been rendered. Helps in 2 ways. Using it doesn't cause any additional renders.
 * - Did the component render when it shouldn't have?
 * - Did the component reset its state when it shouldn't have?
 */
export const RenderCounter = ({ label }: { label: string }) => {
  const counterRef = useRef(0);
  counterRef.current++;
  return (
    <span>
      <span>{label}:</span>
      <span>{counterRef.current} </span>
    </span>
  );
};
