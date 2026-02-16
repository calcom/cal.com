import { useEffect, useRef } from "react";
import { ActionSheetIOS } from "react-native";
import { LANDING_PAGE_OPTIONS, type LandingPage } from "@/hooks/useUserPreferences";

interface LandingPagePickerProps {
  visible: boolean;
  currentValue: LandingPage;
  onSelect: (value: LandingPage) => void;
  onClose: () => void;
}

export function LandingPagePicker({
  visible,
  currentValue: _currentValue,
  onSelect,
  onClose,
}: LandingPagePickerProps) {
  const sheetShownRef = useRef(false);

  useEffect(() => {
    if (visible && !sheetShownRef.current) {
      sheetShownRef.current = true;

      const options = [...LANDING_PAGE_OPTIONS.map((opt) => opt.label), "Cancel"];
      const cancelButtonIndex = options.length - 1;

      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: "First Page",
          message: "Choose which page opens when you launch the app",
          options,
          cancelButtonIndex,
          destructiveButtonIndex: undefined,
        },
        (buttonIndex) => {
          if (buttonIndex !== cancelButtonIndex && buttonIndex < LANDING_PAGE_OPTIONS.length) {
            const selectedOption = LANDING_PAGE_OPTIONS[buttonIndex];
            if (selectedOption) {
              onSelect(selectedOption.value);
            }
          }
          onClose();
        }
      );
    }

    if (!visible) {
      sheetShownRef.current = false;
    }
  }, [visible, onSelect, onClose]);

  return null;
}
