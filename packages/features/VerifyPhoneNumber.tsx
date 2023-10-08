import { useState, useEffect, useMemo, useCallback } from "react";

import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import { trpc } from "@calcom/trpc/react";
import { Badge, Button, showToast, PhoneInput, Label, TextField } from "@calcom/ui";

export const EditableVerifyPhoneNumber = () => {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const { data: _verifiedNumbers, isLoading } = trpc.viewer.workflows.getVerifiedNumbers.useQuery();

  const sendVerificationCodeMutation = trpc.viewer.workflows.sendVerificationCode.useMutation({
    onSuccess: async () => {
      showToast(t("verification_code_sent"), "success");
    },
    onError: async (error) => {
      showToast(error.message, "error");
    },
  });

  const verifyPhoneNumberMutation = trpc.viewer.workflows.verifyPhoneNumber.useMutation({
    onSuccess: async (isVerified: boolean) => {
      showToast(isVerified ? t("verified_successfully") : t("wrong_code"), "success");
      setNumberVerified(isVerified);
      setIsEditing(false);
      utils.viewer.workflows.getVerifiedNumbers.invalidate();
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
        setNumberVerified(false);
      }
    },
  });

  const [verificationCode, setVerificationCode] = useState("");

  const verifiedNumbers = useMemo(() => {
    return _verifiedNumbers?.map((number) => number.phoneNumber) || [];
  }, [_verifiedNumbers]);

  //   const getNumberVerificationStatus = (pn) => !!verifiedNumbers.find((number: string) => number === pn);

  const [currentVN, setCurrentVN] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [numberToVerify, setNumberToVerify] = useState("");
  const [numberVerified, setNumberVerified] = useState(false);

  const DisplayPhoneNumber = useCallback(() => {
    return (
      <div className="hover:border-emphasis dark:focus:border-emphasis border-default bg-default placeholder:text-muted text-emphasis disabled:hover:border-default disabled:bg-subtle focus:ring-brand-default mb-2 block h-9 w-full rounded-md border px-3 py-2 text-sm leading-4 focus:border-neutral-300 focus:outline-none focus:ring-2 disabled:cursor-not-allowed">
        {currentVN}
      </div>
    );
  }, [currentVN]);

  useEffect(() => {
    console.log("rerunning");
    const currentNumber = verifiedNumbers[0];
    console.log({ currentNumber });
    setCurrentVN(currentNumber);
  }, [verifiedNumbers]);

  if (isLoading) {
    return null;
  }

  return (
    <>
      {isEditing || currentVN == "" ? (
        <div className="bg-muted mt-2 rounded-md p-4 pt-0">
          <Label className="pt-4">{t("phone_number")}</Label>
          <div className="block sm:flex">
            <PhoneInput
              placeholder={t("phone_number")}
              id="phoneNumber"
              className="min-w-fit sm:rounded-r-none sm:rounded-bl-md sm:rounded-tl-md"
              required
              onChange={(val) => {
                const isAlreadyVerified = !!verifiedNumbers
                  ?.concat([])
                  .find((number) => number.replace(/\s/g, "") === val?.replace(/\s/g, ""));
                setNumberVerified(isAlreadyVerified);
                setNumberToVerify(val);
              }}
            />
            <Button
              color="secondary"
              disabled={numberVerified}
              className={classNames(
                "-ml-[3px] h-[40px] min-w-fit sm:block sm:rounded-bl-none sm:rounded-tl-none",
                numberVerified ? "hidden" : "mt-3 sm:mt-0"
              )}
              onClick={() =>
                sendVerificationCodeMutation.mutate({
                  phoneNumber: numberToVerify || "",
                })
              }>
              {t("send_code")}
            </Button>
          </div>

          {/* {form.formState.errors.steps && form.formState?.errors?.phoneNumber && (
        <p className="mt-1 text-xs text-red-500">{form.formState?.errors?.phoneNumber?.message || ""}</p>
      )} */}
          {numberVerified ? (
            <div className="mt-1">
              <Badge variant="green">{t("number_verified")}</Badge>
            </div>
          ) : (
            <>
              <div className="mt-3 flex">
                <TextField
                  className="rounded-r-none border-r-transparent"
                  placeholder="Verification code"
                  value={verificationCode}
                  onChange={(e) => {
                    setVerificationCode(e.target.value);
                  }}
                  required
                />
                <Button
                  color="secondary"
                  className="-ml-[3px] h-[38px] min-w-fit sm:block sm:rounded-bl-none sm:rounded-tl-none "
                  disabled={verifyPhoneNumberMutation.isLoading}
                  onClick={() => {
                    verifyPhoneNumberMutation.mutate({
                      phoneNumber: numberToVerify,
                      code: verificationCode,
                    });
                  }}>
                  {t("verify")}
                </Button>
              </div>
              {/* {form.formState.errors.steps && form.formState?.errors?.phoneNumber && (
            <p className="mt-1 text-xs text-red-500">{form.formState?.errors?.phoneNumber?.message || ""}</p>
          )} */}
            </>
          )}
        </div>
      ) : (
        <div className="bg-muted mt-2 rounded-md p-4 pt-0">
          <Label className="pt-4">{t("custom_phone_number")}</Label>
          <div className="flex gap-6">
            {DisplayPhoneNumber()}
            <Button onClick={() => setIsEditing(true)}>Change</Button>
          </div>
        </div>
      )}
    </>
  );
};
