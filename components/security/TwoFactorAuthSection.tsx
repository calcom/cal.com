import { useState } from "react";

import Badge from "@components/ui/Badge";
import Button from "@components/ui/Button";

import DisableTwoFactorModal from "./DisableTwoFactorModal";
import EnableTwoFactorModal from "./EnableTwoFactorModal";

const TwoFactorAuthSection = ({ twoFactorEnabled }: { twoFactorEnabled: boolean }) => {
  const [enabled, setEnabled] = useState(twoFactorEnabled);
  const [enableModalOpen, setEnableModalOpen] = useState(false);
  const [disableModalOpen, setDisableModalOpen] = useState(false);

  return (
    <>
      <div className="flex flex-row items-center">
        <h2 className="font-cal text-lg leading-6 font-medium text-gray-900">Two-Factor Authentication</h2>
        <Badge className="text-xs ml-2" variant={enabled ? "success" : "gray"}>
          {enabled ? "Enabled" : "Disabled"}
        </Badge>
      </div>
      <p className="mt-1 text-sm text-gray-500">
        Add an extra layer of security to your account in case your password is stolen.
      </p>

      <Button
        className="mt-6"
        type="submit"
        onClick={() => (enabled ? setDisableModalOpen(true) : setEnableModalOpen(true))}>
        {enabled ? "Disable" : "Enable"} Two-Factor Authentication
      </Button>

      {enableModalOpen && (
        <EnableTwoFactorModal
          onEnable={() => {
            setEnabled(true);
            setEnableModalOpen(false);
          }}
          onCancel={() => setEnableModalOpen(false)}
        />
      )}

      {disableModalOpen && (
        <DisableTwoFactorModal
          onDisable={() => {
            setEnabled(false);
            setDisableModalOpen(false);
          }}
          onCancel={() => setDisableModalOpen(false)}
        />
      )}
    </>
  );
};

export default TwoFactorAuthSection;
