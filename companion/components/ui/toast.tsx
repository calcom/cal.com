import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

interface ToastProps {
  visible: boolean;
  message: string;
  type: "success" | "error";
}

/**
 * Toast notification component that displays at the bottom of the screen.
 * Use with the useToast hook for state management.
 *
 * @example
 * ```tsx
 * const { toast, showToast } = useToast();
 *
 * return (
 *   <>
 *     <Button onPress={() => showToast("Done!")} />
 *     <Toast {...toast} />
 *   </>
 * );
 * ```
 */
export function Toast({ visible, message, type }: ToastProps) {
  if (!visible) return null;

  return (
    <View style={{ position: "absolute", bottom: 100, left: 16, right: 16 }} pointerEvents="none">
      <View
        className={`flex-row items-center rounded-lg px-4 py-3 shadow-lg ${
          type === "error" ? "bg-red-600" : "bg-gray-800"
        }`}
      >
        <Ionicons
          name={type === "error" ? "close-circle" : "checkmark-circle"}
          size={20}
          color="white"
          style={{ marginRight: 8 }}
        />
        <Text className="flex-1 text-sm font-medium text-white">{message}</Text>
      </View>
    </View>
  );
}

export type { ToastProps };
