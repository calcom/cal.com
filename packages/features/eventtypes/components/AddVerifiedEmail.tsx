import { useState } from "react";

import { VerifyCodeDialog } from "@calcom/features/bookings/components/VerifyCodeDialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { Button } from "@calcom/ui/components/button";
import { TextField, Label } from "@calcom/ui/components/form";
import { Tooltip } from "@calcom/ui/components/tooltip";

import { useAddVerifiedEmail } from "../../../platform/atoms/event-types/hooks/useAddVerifiedEmail";
import { useGetVerifiedEmails } from "../../../platform/atoms/event-types/hooks/useGetVerifiedEmails";
import { useVerifyCode } from "../../../platform/atoms/hooks/useVerifyCode";
import { useVerifyEmail } from "../../../platform/atoms/hooks/useVerifyEmail";

type AddVerifiedEmailProps = {
  username?: string;
  showToast: (message: string, variant: "success" | "warning" | "error") => void;
};

const AddVerifiedEmail = ({ username, showToast }: AddVerifiedEmailProps) => {
  const { t } = useLocale();
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [isEmailVerificationModalVisible, setIsEmailVerificationModalVisible] = useState(false);
  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const { refetch: refetchVerifiedEmails } = useGetVerifiedEmails();
  const { mutateAsync: addVerifiedEmail } = useAddVerifiedEmail({
    onSuccess: () => {
      refetchVerifiedEmails();
      showToast(t("email_verified"), "success");
    },
    onError: () => {
      showToast(t("something_went_wrong"), "error");
    },
  });

  const verifyEmail = useVerifyEmail({
    email: verifiedEmail,
    name: username || t("there"),
    requiresBookerEmailVerification: true,
  });

  const { handleVerifyEmail } = verifyEmail;

  const verifyCode = useVerifyCode({
    onSuccess: async () => {
      setIsEmailVerificationModalVisible(false);
      setVerifiedEmail("");

      await addVerifiedEmail({
        email: verifiedEmail,
      });
    },
  });

  return (
    <div>
      <div className="border-subtle border border-t-0 p-6">
        <Label
          className={classNames("text-emphasis mb-2 block text-sm font-medium leading-none")}
          htmlFor="add-verified-emails">
          {t("add_verified_emails")}
        </Label>
        <TextField
          id="add-verified-emails"
          containerClassName={classNames("w-full")}
          value={verifiedEmail}
          onChange={(e) => setVerifiedEmail(e.target.value)}
          data-testid="add-verified-emails"
          addOnSuffix={
            <Tooltip content={t("add_verified_email")}>
              <Button
                type="button"
                color="minimal"
                size="sm"
                StartIcon="arrow-right"
                onClick={() => {
                  if (!!verifiedEmail && isValidEmail(verifiedEmail)) {
                    setIsEmailVerificationModalVisible(true);
                    handleVerifyEmail();
                  }
                }}
              />
            </Tooltip>
          }
        />
      </div>
      <>
        <VerifyCodeDialog
          isOpenDialog={isEmailVerificationModalVisible}
          setIsOpenDialog={setIsEmailVerificationModalVisible}
          email={verifiedEmail}
          isUserSessionRequiredToVerify={false}
          verifyCodeWithSessionNotRequired={verifyCode.verifyCodeWithSessionNotRequired}
          verifyCodeWithSessionRequired={verifyCode.verifyCodeWithSessionRequired}
          error={verifyCode.error}
          resetErrors={verifyCode.resetErrors}
          isPending={verifyCode.isPending}
          setIsPending={verifyCode.setIsPending}
        />
      </>
    </div>
  );
};

export default AddVerifiedEmail;
