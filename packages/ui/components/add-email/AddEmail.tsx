import { useCallback, useEffect, useState } from "react";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import {Button, Dialog, DialogClose, DialogContent, DialogTrigger, InputField} from "../..";
import { Plus } from "@calcom/ui/components/icon";

type AddEmailProps = {
  buttonMsg: string;
};


export default function AddEmail({
  buttonMsg,
  ...props
}: AddEmailProps) {
  const { t } = useLocale();
  const [showConfirmationScreen, setShowConfirmationScreen] = useState<boolean>(false);

  useEffect(() => {
  }, []);

  return (
    <Dialog
      onOpenChange={
        (opened) => !opened && setShowConfirmationScreen(false)
      }>
      <DialogTrigger asChild>
        <Button color="secondary" type="button" className="mt-4 py-1 text-sm" StartIcon={Plus}>
          {buttonMsg}
        </Button>
      </DialogTrigger>
      <DialogContent>
        {
          showConfirmationScreen
            ?
            <>
              <div className="mb-4 sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:text-left">
                  <h3 className="font-cal text-emphasis text-lg leading-6" id="modal-title">
                    {"Confirm your email"}
                  </h3>
                  <div className="mt-3 text-default text-sm ltr:mr-4 rtl:ml-4">{"We sent you an email with a link to confirm. Please click the link in the email to verify this address."}</div>
                </div>
              </div>
            </>
            :
            <>
              <div className="mb-1 sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:text-left">
                  <h3 className="font-cal text-emphasis text-lg leading-6" id="modal-title">
                    {"Add email"}
                  </h3>
                  <div className="mt-3 text-default text-sm ltr:mr-4 rtl:ml-4">{"Add an email address to replace your primary or to use as an alternative email on your event types."}</div>
                </div>
              </div>
              <div className="mb-4 sm:flex sm:items-start w-full">
                <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                  <div className="font-medium text-emphasis text-sm leading-6" id="modal-title">
                    {"Email Address"}
                  </div>
                  <InputField
                    className="mt-2"
                    type="email"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect="off"
                    inputMode="email"
                    inputIsFullWidth={true}
                    placeholder={t("email")}
                  />
                </div>
              </div>
            </>
        }
        <div className="mt-5 flex flex-row-reverse gap-x-2 sm:mt-4">
          {
            showConfirmationScreen ?
              <>
                <DialogClose color="primary">
                  {t("done")}
                </DialogClose>
              </>
              :
              <>
                <Button color="primary" type="button" className="py-1 text-sm" onClick={() => setShowConfirmationScreen(true)}>
                  {"Add Email"}
                </Button>
                <DialogClose color="minimal">{t("cancel")}</DialogClose>
              </>
          }

        </div>
      </DialogContent>
    </Dialog>
  );
}
