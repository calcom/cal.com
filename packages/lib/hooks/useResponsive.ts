import { useEffect, useState } from "react";

const useResponsive = () => {
  const [width, setWidth] = useState(window.innerWidth);
  const handleWindowSizeChange = () => {
    setWidth(window.innerWidth);
  };

  useEffect(() => {
    window.addEventListener("resize", handleWindowSizeChange);
    return () => {
      window.removeEventListener("resize", handleWindowSizeChange);
    };
  }, []);

  return {
    isSm: width <= 640,
    isMd: width > 640 && width <= 768,
    isLg: width > 768 && width <= 1024,
    isXl: width > 1024 && width <= 1280,
    is2xl: width > 1280 && width < 1536,
  };
};

export default useResponsive;
