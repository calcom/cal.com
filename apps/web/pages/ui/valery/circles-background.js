import { useRef, useEffect } from "react";

const CirclesBackground = ({ className }) => {
  const numCircles = 80; // number of circles
  const maxRadius = 3000; // maximum radius (half of viewBox dimension)
  // const opacityStep = 1 / numCircles; // each circle will be this much more opaque than the last

  const circles = [];
  const svgRef = useRef(null); // reference to the SVG

  for (let i = 0; i < numCircles; i++) {
    const radius = (i + 1) * (maxRadius / numCircles); // radius grows by a constant step
    const opacity = Math.sqrt((i + 1) / numCircles) / 1.5; // square root function for opacity

    // const opacity = Math.cbrt((i + 1) / numCircles); // Cubic root function for opacity

    circles.push(
      <circle
        key={i}
        cx={3000}
        cy={3000}
        r={radius}
        fill="none"
        stroke="#FFF" // circle color
        strokeWidth={0.5}
        strokeOpacity={opacity}
      />
    );
  }

  useEffect(() => {
    if (svgRef.current) {
      // const strokeWidth = 0.5 / window.devicePixelRatio;
      const strokeWidth = 1;
      const circles = svgRef.current.querySelectorAll("circle");
      circles.forEach((circle) => circle.setAttribute("stroke-width", strokeWidth));
    }
  }, []);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 6000 6000"
      preserveAspectRatio="xMidYMid meet"
      width={6000}
      height={6000}
      className={className}>
      {circles}
    </svg>
  );
};

export default CirclesBackground;
