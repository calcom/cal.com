import { Platform, View } from "react-native";

interface HeaderButtonWrapperProps {
  children: React.ReactNode;
  side: "left" | "right";
}

const WEB_HEADER_INSET = 12;

export function HeaderButtonWrapper({ children, side }: HeaderButtonWrapperProps) {
  if (Platform.OS !== "web") {
    return <>{children}</>;
  }

  const style =
    side === "left" ? { marginLeft: WEB_HEADER_INSET } : { marginRight: WEB_HEADER_INSET };

  return <View style={style}>{children}</View>;
}
