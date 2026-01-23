import { Ionicons } from "@expo/vector-icons";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

interface SearchHeaderProps {
  /** Current search query value */
  searchQuery: string;
  /** Callback when search query changes */
  onSearchChange: (query: string) => void;
  /** Placeholder text for search input (default: "Search") */
  placeholder?: string;
  /** Callback when New button is pressed */
  onNewPress: () => void;
  /** Text for the New button (default: "New") */
  newButtonText?: string;
}

/**
 * Reusable search header component with a search input and "New" button.
 * Used consistently across Android list screens.
 *
 * @example
 * ```tsx
 * <SearchHeader
 *   searchQuery={searchQuery}
 *   onSearchChange={setSearchQuery}
 *   placeholder="Search event types"
 *   onNewPress={handleCreateNew}
 * />
 * ```
 */
export function SearchHeader({
  searchQuery,
  onSearchChange,
  placeholder = "Search",
  onNewPress,
  newButtonText = "New",
}: SearchHeaderProps) {
  return (
    <View className="flex-row items-center gap-3 border-b border-gray-300 bg-gray-100 px-4 py-2">
      <TextInput
        className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[17px] text-black focus:border-black focus:ring-2 focus:ring-black"
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        value={searchQuery}
        onChangeText={onSearchChange}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TouchableOpacity
        className="min-w-[60px] flex-row items-center justify-center gap-1 rounded-lg bg-black px-2.5 py-2"
        onPress={onNewPress}
      >
        <Ionicons name="add" size={18} color="#fff" />
        <Text className="text-base font-semibold text-white">{newButtonText}</Text>
      </TouchableOpacity>
    </View>
  );
}

export type { SearchHeaderProps };
