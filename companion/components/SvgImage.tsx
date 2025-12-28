import { Image } from "expo-image";
import type React from "react";
import { useState } from "react";
import { View } from "react-native";
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
    // Use expo-image for non-SVG or if SVG failed (better performance with caching)
    return (
      <View style={style}>
        <Image
          source={{ uri }}
          style={{ width, height }}
          contentFit="contain"
          transition={200}
          onError={() => {
            // Image load errors are expected for invalid/missing URLs - silently handled
          }}
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
        onError={() => {
          // SVG load errors trigger fallback to regular Image component
          setUseFallback(true);
        }}
      />
    </View>
  );
};
