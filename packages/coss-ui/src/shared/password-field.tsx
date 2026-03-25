"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@coss/ui/components/button";
import type { InputProps } from "@coss/ui/components/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@coss/ui/components/input-group";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@coss/ui/components/tooltip";
import { EyeIcon, EyeOffIcon } from "@coss/ui/icons";
import * as React from "react";

export const PasswordField = React.forwardRef<HTMLInputElement, InputProps>(
  ({ type: _type, ...props }, ref): React.ReactElement => {
    const [showPassword, setShowPassword] = React.useState(false);
    const { t } = useLocale();
    return (
      <InputGroup>
        <InputGroupInput
          {...props}
          ref={ref}
          autoCapitalize="none"
          autoCorrect="off"
          placeholder={props.placeholder ?? "•••••••••••••"}
          spellCheck={false}
          type={showPassword ? "text" : "password"}
        />
        <InputGroupAddon align="inline-end">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label={showPassword ? t("hide_password") : t("show_password")}
                  onClick={() => setShowPassword(!showPassword)}
                  size="icon-xs"
                  type="button"
                  variant="ghost"
                />
              }>
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </TooltipTrigger>
            <TooltipPopup>{showPassword ? t("hide_password") : t("show_password")}</TooltipPopup>
          </Tooltip>
        </InputGroupAddon>
      </InputGroup>
    );
  }
);

PasswordField.displayName = "PasswordField";
