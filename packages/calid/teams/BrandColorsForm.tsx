import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";

import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import { DEFAULT_LIGHT_BRAND_COLOR, DEFAULT_DARK_BRAND_COLOR } from "@calcom/lib/constants";
import { checkWCAGContrastColor } from "@calcom/lib/getBrandColours";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { Alert } from "@calcom/ui/components/alert";
import { Button } from "@calcom/ui/components/button";
import { ColorPicker } from "@calcom/ui/components/form";
import { SettingsToggle } from "@calcom/ui/components/form";

interface ColorSchemeValues {
  brandColor: string;
  darkBrandColor: string;
}

const useColorValidation = () => {
  const [lightThemeValidationError, setLightThemeValidationError] = useState(false);
  const [darkThemeValidationError, setDarkThemeValidationError] = useState(false);

  const validateLightModeColor = (colorValue: string) => {
    const isValid = checkWCAGContrastColor("#ffffff", colorValue);
    setLightThemeValidationError(!isValid);
    return isValid;
  };

  const validateDarkModeColor = (colorValue: string) => {
    const isValid = checkWCAGContrastColor("#101010", colorValue);
    setDarkThemeValidationError(!isValid);
    return isValid;
  };

  return {
    lightThemeValidationError,
    darkThemeValidationError,
    validateLightModeColor,
    validateDarkModeColor,
  };
};

const LightColorPickerSection = ({ 
  defaultColorValue, 
  formContext, 
  onColorChange 
}: {
  defaultColorValue: string;
  formContext: any;
  onColorChange: (value: string) => void;
}) => {
  const { t } = useLocale();

  return (
    <Controller
      name="brandColor"
      control={formContext.control}
      defaultValue={defaultColorValue}
      render={() => (
        <div>
          <p className="text-default mb-2 block text-sm font-medium">{t("light_brand_color")}</p>
          <ColorPicker
            defaultValue={defaultColorValue || DEFAULT_LIGHT_BRAND_COLOR}
            resetDefaultValue={DEFAULT_LIGHT_BRAND_COLOR}
            onChange={(colorValue) => {
              onColorChange(colorValue);
              formContext.setValue("brandColor", colorValue, { shouldDirty: true });
            }}
          />
        </div>
      )}
    />
  );
};

const DarkColorPickerSection = ({ 
  defaultColorValue, 
  formContext, 
  onColorChange 
}: {
  defaultColorValue: string;
  formContext: any;
  onColorChange: (value: string) => void;
}) => {
  const { t } = useLocale();

  return (
    <Controller
      name="darkBrandColor"
      control={formContext.control}
      defaultValue={defaultColorValue}
      render={() => (
        <div className="mt-6 sm:mt-0">
          <p className="text-default mb-2 block text-sm font-medium">{t("dark_brand_color")}</p>
          <ColorPicker
            defaultValue={defaultColorValue || DEFAULT_DARK_BRAND_COLOR}
            resetDefaultValue={DEFAULT_DARK_BRAND_COLOR}
            onChange={(colorValue) => {
              onColorChange(colorValue);
              formContext.setValue("darkBrandColor", colorValue, { shouldDirty: true });
            }}
          />
        </div>
      )}
    />
  );
};

const ColorValidationAlert = ({ 
  hasError, 
  errorMessageKey 
}: {
  hasError: boolean;
  errorMessageKey: string;
}) => {
  const { t } = useLocale();

  if (!hasError) return null;

  return (
    <div className="mt-4">
      <Alert severity="warning" message={t(errorMessageKey)} />
    </div>
  );
};

const BrandColorsForm = ({
  onSubmit,
  brandColor,
  darkBrandColor,
}: {
  onSubmit: (values: ColorSchemeValues) => void;
  brandColor: string | undefined;
  darkBrandColor: string | undefined;
}) => {
  const { t } = useLocale();
  const brandColorsFormMethods = useFormContext();
  const {
    formState: { isSubmitting: isColorFormSubmitting, isDirty: hasColorFormChanges },
  } = brandColorsFormMethods;

  const isCustomColoringEnabled = brandColor !== DEFAULT_LIGHT_BRAND_COLOR || darkBrandColor !== DEFAULT_DARK_BRAND_COLOR;
  const [customColorToggleState, setCustomColorToggleState] = useState(isCustomColoringEnabled);

  const {
    lightThemeValidationError,
    darkThemeValidationError,
    validateLightModeColor,
    validateDarkModeColor,
  } = useColorValidation();

  const handleToggleChange = (toggleValue: boolean) => {
    setCustomColorToggleState(toggleValue);
    if (!toggleValue) {
      onSubmit({
        brandColor: DEFAULT_LIGHT_BRAND_COLOR,
        darkBrandColor: DEFAULT_DARK_BRAND_COLOR,
      });
    }
  };

  const processLightColorChange = (colorValue: string) => {
    validateLightModeColor(colorValue);
  };

  const processDarkColorChange = (colorValue: string) => {
    validateDarkModeColor(colorValue);
  };

  const containerClasses = classNames(
    "py-6 px-4 sm:px-6 border-subtle rounded-xl border",
    customColorToggleState && "rounded-b-none"
  );

  return (
    <div className="mt-6">
      <SettingsToggle
        toggleSwitchAtTheEnd={true}
        title={t("custom_brand_colors")}
        description={t("customize_your_brand_colors")}
        checked={customColorToggleState}
        onCheckedChange={handleToggleChange}
        childrenClassName="lg:ml-0"
        switchContainerClassName={containerClasses}>
        <div className="border-subtle flex flex-col gap-6 border-x p-6">
          <div>
            <LightColorPickerSection
              defaultColorValue={brandColor || DEFAULT_LIGHT_BRAND_COLOR}
              formContext={brandColorsFormMethods}
              onColorChange={processLightColorChange}
            />
            <ColorValidationAlert
              hasError={lightThemeValidationError}
              errorMessageKey="light_theme_contrast_error"
            />
          </div>

          <div>
            <DarkColorPickerSection
              defaultColorValue={darkBrandColor || DEFAULT_DARK_BRAND_COLOR}
              formContext={brandColorsFormMethods}
              onColorChange={processDarkColorChange}
            />
            <ColorValidationAlert
              hasError={darkThemeValidationError}
              errorMessageKey="dark_theme_contrast_error"
            />
          </div>
        </div>
        <SectionBottomActions align="end">
          <Button
            disabled={isColorFormSubmitting || !hasColorFormChanges}
            color="primary"
            type="submit">
            {t("update")}
          </Button>
        </SectionBottomActions>
      </SettingsToggle>
    </div>
  );
};

export default BrandColorsForm;