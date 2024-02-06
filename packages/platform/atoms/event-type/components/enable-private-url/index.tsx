import { Info, Copy } from "lucide-react";
import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";

import { classNames } from "@calcom/lib";
import { APP_NAME } from "@calcom/lib/constants";
import { IS_VISUAL_REGRESSION_TESTING } from "@calcom/lib/constants";
import { SettingsToggle, TextField, Tooltip, Button, showToast } from "@calcom/ui";

import type { FormValues } from "../../types";

type EnablePrivateURLProps = {
  formMethods: UseFormReturn<FormValues, any>;
  shouldLockDisableProps: (fieldName: string) => {
    disabled: boolean;
    LockedIcon: false | JSX.Element;
  };
  hashedLink: {
    link: string;
    id: number;
    eventTypeId: number;
  } | null;
  isHashedLinkVisible: boolean;
  placeholderHashedLink: string;
  hashedUrl?: string;
};

export function EnablePrivateURL({
  formMethods,
  isHashedLinkVisible,
  shouldLockDisableProps,
  hashedUrl,
  placeholderHashedLink,
  hashedLink,
}: EnablePrivateURLProps) {
  const [hashedLinkVisible, setHashedLinkVisible] = useState(isHashedLinkVisible);

  return (
    <SettingsToggle
      labelClassName="text-sm"
      toggleSwitchAtTheEnd={true}
      switchContainerClassName={classNames(
        "border-subtle rounded-lg border py-6 px-4 sm:px-6",
        hashedLinkVisible && "rounded-b-none"
      )}
      childrenClassName="lg:ml-0"
      data-testid="hashedLinkCheck"
      title="Enable Private URL"
      Badge={
        <a
          target="_blank"
          rel="noreferrer"
          href="https://cal.com/docs/core-features/event-types/single-use-private-links">
          <Info className="ml-1.5 h-4 w-4 cursor-pointer" />
        </a>
      }
      {...shouldLockDisableProps("hashedLinkCheck")}
      description={`Generate a private URL to share without exposing your ${APP_NAME} username`}
      checked={hashedLinkVisible}
      onCheckedChange={(e) => {
        formMethods.setValue("hashedLink", e ? hashedUrl : undefined);
        setHashedLinkVisible(e);
      }}>
      <div className="border-subtle rounded-b-lg border border-t-0 p-6">
        {!IS_VISUAL_REGRESSION_TESTING && (
          <TextField
            disabled
            name="hashedLink"
            label="Private link"
            data-testid="generated-hash-url"
            labelSrOnly
            type="text"
            hint="Your private link will regenerate after each use"
            defaultValue={placeholderHashedLink}
            addOnSuffix={
              <Tooltip content={hashedLink ? "Copy to clipboard" : "Enabled after update"}>
                <Button
                  color="minimal"
                  size="sm"
                  type="button"
                  className="hover:stroke-3 hover:text-emphasis min-w-fit !py-0 px-0 hover:bg-transparent"
                  aria-label="copy link"
                  onClick={() => {
                    navigator.clipboard.writeText(placeholderHashedLink);
                    if (hashedLink) {
                      showToast("Private link copied!", "success");
                    } else {
                      showToast("The private link will work after saving", "warning");
                    }
                  }}>
                  <Copy className="h-4 w-4" />
                </Button>
              </Tooltip>
            }
          />
        )}
      </div>
    </SettingsToggle>
  );
}
