import { useState, useRef, useEffect, useMemo } from "react";

import { DAY_CELL_WIDTH } from "../constants";

function rounded(x: number, dayCellWidth: number) {
  let n = Math.round(x / dayCellWidth);
  n = Math.max(0, n);
  n = Math.min(24, n);
  return n * dayCellWidth;
}
function useElementBounding<T extends HTMLDivElement>(ref: React.RefObject<T>): DOMRect | null {
  const [boundingRect, setBoundingRect] = useState<DOMRect | null>(null);
  const observer = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    const target = ref.current;

    function updateBoundingRect() {
      if (target) {
        const rect = target.getBoundingClientRect();
        setBoundingRect(rect);
      }
    }

    updateBoundingRect();

    observer.current = new ResizeObserver(updateBoundingRect);
    observer.current.observe(target as Element);

    return () => {
      if (observer.current) {
        observer.current.disconnect();
        observer.current = null;
      }
    };
  }, [ref]);

  return boundingRect;
}

function useMouse() {
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [isPressed, setIsPressed] = useState(false);

  useEffect(() => {
    function handleMouseMove(event: MouseEvent) {
      setX(event.clientX);
      setY(event.clientY);
    }

    function handleMouseDown() {
      setIsPressed(true);
    }

    function handleMouseUp() {
      setIsPressed(false);
    }

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return { x, y, isPressed };
}

export function HoverOverview() {
  const top = useRef(0);
  const bottom = useRef(0);
  const edgeStart = useRef(0);
  const edgeEnd = useRef(0);
  const [leftEdge, setLeftEdge] = useState(0);
  const [rightEdge, setRightEdge] = useState(0);
  const [width, setWidth] = useState(0);

  const { x, y, isPressed: pressed } = useMouse();
  const el = useRef<HTMLDivElement | null>(null);
  const box = useElementBounding(el);

  useEffect(() => {
    function updateEdge() {
      const roundedX = rounded(x - (box?.left || 0), DAY_CELL_WIDTH);
      edgeStart.current = roundedX;
      edgeEnd.current = roundedX;
      setLeftEdge(roundedX);
    }

    if (pressed) {
      updateEdge();
    }
  }, [pressed, x, box]);

  useEffect(() => {
    if (pressed) {
      const roundedX = rounded(x - (box?.left || 0), DAY_CELL_WIDTH);
      edgeEnd.current = roundedX;
      setRightEdge(roundedX);
    }
  }, [pressed, x, box]);

  useEffect(() => {
    setWidth(Math.abs(edgeStart.current - edgeEnd.current));
  }, [edgeStart, edgeEnd]);

  const position = useMemo(
    () => ({
      left: `${leftEdge}px`,
      top: `${top}px`,
      bottom: `${bottom}px`,
      width: `${width}px`,
    }),
    [leftEdge, top, bottom, width]
  );

  const leftWhiteout = useMemo(
    () => ({
      left: "0",
      top: `${top}px`,
      bottom: `${bottom}px`,
      width: `${leftEdge}px`,
    }),
    [leftEdge, top, bottom]
  );

  const rightWhiteout = useMemo(
    () => ({
      right: "0",
      top: `${top}px`,
      bottom: `${bottom}px`,
      left: `${rightEdge}px`,
    }),
    [rightEdge, top, bottom]
  );

  return (
    <div ref={el} className="absoulte inset-0 w-full">
      <div className="bg-default/80 absolute" style={leftWhiteout} />
      <div className="bg-default/80 absolute" style={rightWhiteout} />
      <div className="border-emphasis border border-dashed" style={position} />
    </div>
  );
}
