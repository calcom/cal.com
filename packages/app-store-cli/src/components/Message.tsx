import { Text } from "ink";
import React, { useEffect, useState } from "react";

export function Message({
  message,
}: {
  message: { text: string; type: "info" | "error" | "success"; isProgress: boolean };
}) {
  const color = message.type === "success" ? "green" : message.type === "error" ? "red" : "white";
  const [progressText, setProgressText] = useState("...");
  useEffect(() => {
    if (message.isProgress) {
      const interval = setInterval(() => {
        setProgressText((progressText) => {
          return progressText.length > 3 ? "" : progressText + ".";
        });
      }, 1000);
      return () => {
        clearInterval(interval);
      };
    }
  }, [message.isProgress]);
  return (
    <Text color={color}>
      {message.text}
      {message.isProgress && progressText}
    </Text>
  );
}
