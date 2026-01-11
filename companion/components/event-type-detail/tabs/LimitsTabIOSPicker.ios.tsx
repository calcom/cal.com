import { Button, ContextMenu, Host, HStack, Image } from "@expo/ui/swift-ui";
import { buttonStyle } from "@expo/ui/swift-ui/modifiers";
import { isLiquidGlassAvailable } from "expo-glass-effect";

interface LimitsTabIOSPickerProps {
  options: string[];
  selectedValue: string;
  onSelect: (value: string) => void;
}

export function LimitsTabIOSPicker({ options, selectedValue, onSelect }: LimitsTabIOSPickerProps) {
  return (
    <Host matchContents>
      <ContextMenu
        modifiers={[buttonStyle(isLiquidGlassAvailable() ? "glass" : "bordered")]}
        activationMethod="singlePress"
      >
        <ContextMenu.Items>
          {options.map((opt) => (
            <Button
              key={opt}
              systemImage={selectedValue === opt ? "checkmark" : undefined}
              onPress={() => onSelect(opt)}
              label={opt}
            />
          ))}
        </ContextMenu.Items>
        <ContextMenu.Trigger>
          <HStack>
            <Image systemName="chevron.up.chevron.down" color="primary" size={13} />
          </HStack>
        </ContextMenu.Trigger>
      </ContextMenu>
    </Host>
  );
}
