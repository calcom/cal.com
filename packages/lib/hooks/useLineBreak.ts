//handles line breaks in html and converts them to HTML line breaks
import { useState, useEffect } from "react";

export const useLineBreak = (inputText: string) => {
  const [convertedText, setConvertedText] = useState<string>("");

  useEffect(() => {
    if (!inputText || inputText === "") {
      setConvertedText("");
    } else {
      setConvertedText(inputText.replace(/\n/g, "<br>"));
    }
  }, [inputText]);

  return convertedText;
};
