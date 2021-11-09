import { useEffect } from "react";

const BrandColor = ({ val }: { val: string }) => {
  useEffect(() => {
    document.documentElement.style.setProperty("--brand-color", val);
  });
  return null;
};

export default BrandColor;
