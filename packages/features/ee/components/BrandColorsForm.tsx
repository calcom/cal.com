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

type BrandColorsFormValues = {
  brandColor: string;
  darkBrandColor: string;
};

const BrandColorsForm = ({
  onSubmit,
  brandColor,
  darkBrandColor,
}: {
  onSubmit: (values: BrandColorsFormValues) => void;
  brandColor: string | undefined;
  darkBrandColor: string | undefined;
}) => {
  const { t } = useLocale();
  const brandColorsFormMethods = useFormContext();
  const {
    formState: { isSubmitting: isBrandColorsFormSubmitting, isDirty: isBrandColorsFormDirty },
  } = brandColorsFormMethods;

  const [isCustomBrandColorChecked, setIsCustomBrandColorChecked] = useState(
    brandColor !== DEFAULT_LIGHT_BRAND_COLOR || darkBrandColor !== DEFAULT_DARK_BRAND_COLOR
  );
  const [darkModeError, setDarkModeError] = useState(false);
  const [lightModeError, setLightModeError] = useState(false);
  return (
    <div className="mt-6">
      <SettingsToggle
        toggleSwitchAtTheEnd={true}
        title={t("custom_brand_colors")}
        description={t("customize_your_brand_colors")}
        checked={isCustomBrandColorChecked}
        onCheckedChange={(checked) => {
          setIsCustomBrandColorChecked(checked);
          if (!checked) {
            onSubmit({
              brandColor: DEFAULT_LIGHT_BRAND_COLOR,
              darkBrandColor: DEFAULT_DARK_BRAND_COLOR,
            });
          }
        }}
        childrenClassName="lg:ml-0"
        switchContainerClassName={classNames(
          "py-6 px-4 sm:px-6 border-subtle rounded-xl border",
          isCustomBrandColorChecked && "rounded-b-none"
        )}>
        <div className="border-subtle flex flex-col gap-6 border-x p-6">
          <Controller
            name="brandColor"
            control={brandColorsFormMethods.control}
            defaultValue={brandColor}
            render={() => (
              <div>
                <p className="text-default mb-2 block text-sm font-medium">{t("light_brand_color")}</p>
                <ColorPicker
                  defaultValue={brandColor || DEFAULT_LIGHT_BRAND_COLOR}
                  resetDefaultValue={DEFAULT_LIGHT_BRAND_COLOR}
                  onChange={(value) => {
                    if (checkWCAGContrastColor("#ffffff", value)) {
                      setLightModeError(false);
                    } else {
                      setLightModeError(true);
                    }
                    brandColorsFormMethods.setValue("brandColor", value, { shouldDirty: true });
                  }}
                />
                {lightModeError ? (
                  <div className="mt-4">
                    <Alert severity="warning" message={t("light_theme_contrast_error")} />
                  </div>
                ) : null}
              </div>
            )}
          />

          <Controller
            name="darkBrandColor"
            control={brandColorsFormMethods.control}
            defaultValue={darkBrandColor}
            render={() => (
              <div className="mt-6 sm:mt-0">
                <p className="text-default mb-2 block text-sm font-medium">{t("dark_brand_color")}</p>
                <ColorPicker
                  defaultValue={darkBrandColor || DEFAULT_DARK_BRAND_COLOR}
                  resetDefaultValue={DEFAULT_DARK_BRAND_COLOR}
                  onChange={(value) => {
                    if (checkWCAGContrastColor("#101010", value)) {
                      setDarkModeError(false);
                    } else {
                      setDarkModeError(true);
                    }
                    brandColorsFormMethods.setValue("darkBrandColor", value, { shouldDirty: true });
                  }}
                />
                {darkModeError ? (
                  <div className="mt-4">
                    <Alert severity="warning" message={t("dark_theme_contrast_error")} />
                  </div>
                ) : null}
              </div>
            )}
          />
        </div>
        <SectionBottomActions align="end">
          <Button
            disabled={isBrandColorsFormSubmitting || !isBrandColorsFormDirty}
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
