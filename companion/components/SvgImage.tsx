import React, { useState } from "react";
import { View, Image } from "react-native";
import { SvgUri } from "react-native-svg";

interface SvgImageProps {
  uri: string;
  width: number;
  height: number;
  style?: { marginRight?: number };
}

/**
 * Component that can display both SVG and regular images
 * Falls back to regular Image if SVG fails
 */
export const SvgImage: React.FC<SvgImageProps> = ({ uri, width, height, style }) => {
  const [useFallback, setUseFallback] = useState(false);
  // Extract pathname (ignore query strings and hash) to detect SVG correctly
  // Handles URLs like: icon.svg?variant=dark or icon.svg#hash
  const pathname = uri.split("?")[0].split("#")[0];
  const isSvg = pathname.toLowerCase().endsWith(".svg");

  if (!isSvg || useFallback) {
    // Use regular Image for non-SVG or if SVG failed
    return (
      <View style={style}>
        <Image
          source={{ uri }}
          style={{ width, height }}
          resizeMode="contain"
          onError={() => console.log("Image load error:", uri)}
        />
      </View>
    );
  }

  // Use SvgUri for SVG files
  return (
    <View style={[{ width, height }, style]}>
      <SvgUri
        uri={uri}
        width={width}
        height={height}
        onError={(error) => {
          console.log("SVG load error, falling back to Image:", error);
          setUseFallback(true);
        }}
      />
    </View>
  );
};
