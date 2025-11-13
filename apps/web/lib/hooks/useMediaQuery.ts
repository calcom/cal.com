// lets refactor and move this into packages/lib/hooks/
import { useState, useEffect } from "react";

const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(() => {
    // Initialize with actual media query value on client
    if (typeof window !== "undefined") {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [matches, query]);

  return matches;
};

export default useMediaQuery;
