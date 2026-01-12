import { Button, ContextMenu, Host, HStack, Image } from "@expo/ui/swift-ui";
import { buttonStyle } from "@expo/ui/swift-ui/modifiers";
import { isLiquidGlassAvailable } from "expo-glass-effect";

interface IOSPickerTriggerProps {
  options: { label: string; value: string }[];
  selectedValue: string;
  onSelect: (value: string) => void;
}

export function IOSPickerTrigger({ options, selectedValue, onSelect }: IOSPickerTriggerProps) {
  return (
    <Host matchContents>
      <ContextMenu
        modifiers={[buttonStyle(isLiquidGlassAvailable() ? "glass" : "bordered")]}
        activationMethod="singlePress"
      >
        <ContextMenu.Items>
          {options.map((opt) => (
            <Button
              key={opt.value}
              systemImage={selectedValue === opt.label ? "checkmark" : undefined}
              onPress={() => onSelect(opt.value)}
              label={opt.label}
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
