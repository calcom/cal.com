import { useEffect } from "react";

const BrandColor = ({ val = "#292929" }: { val: string | undefined | null }) => {
  useEffect(() => {
    document.documentElement.style.setProperty("--brand-color", val);
  }, [val]);
  return null;
};

export default BrandColor;
