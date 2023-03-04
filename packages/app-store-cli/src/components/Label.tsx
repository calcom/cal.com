import { Box, Text } from "ink";
import React from "react";

export default function Label({ children }: { children: React.ReactNode }) {
  return (
    <Box>
      <Text underline>{children}</Text>
      <Text>: </Text>
    </Box>
  );
}
