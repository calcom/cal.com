import Cookies from "js-cookie";
import { useEffect, useState } from "react";

const useIsWebView = () => {
  const [isWebView, setIsWebView] = useState<boolean | null>(null);

  useEffect(() => {
    setIsWebView(Cookies.get("isWebView") === "true");
  }, []);

  return isWebView;
};

export default useIsWebView;
