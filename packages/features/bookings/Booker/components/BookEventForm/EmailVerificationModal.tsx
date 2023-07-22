import { Calendar, Clock } from "lucide-react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, Dialog, DialogContent, TextField } from "@calcom/ui";
import { z } from "zod";
import { useEffect, useState } from "react";

import { useBookerStore } from "../../store";
import { ErrorCode } from "@calcom/features/auth/lib/ErrorCode";
import { trpc } from "@calcom/trpc/react";
import { FormProvider, useForm } from "react-hook-form";

interface VerificationCode {
  emailVerificationCode: string
}

export function EmailVerificationModal({ visible, onCancel, email }: { visible: boolean; onCancel: () => void; email: string }) {
  const { t } = useLocale();
  const formSchema = z
    .object({
      emailVerificationCode: z.string().min(1, `${t("error_required_field")}`),
    })
  const errorMessages: { [key: string]: string } = {
    [ErrorCode.IncorrectEmailVerificationCode]: `${t("incorrect_email_verification_code")} ${t("please_try_again")}`,
  };
  const methods = useForm<VerificationCode>({ resolver: zodResolver(formSchema) });
  const setVerifiedEmail = useBookerStore(state => state.setVerifiedEmail)
  const {formState, register, setError, clearErrors} = methods;
  const verifyTokenMutation = trpc.viewer.auth.verifyToken.useMutation({
    onSuccess() {
      setVerifiedEmail(email)
      onCancel()
    },
    onError() {
      setError("emailVerificationCode", {type: "custom", message: errorMessages[ErrorCode.IncorrectEmailVerificationCode]})
    }
  })

  const onSubmit = () => {
    const {emailVerificationCode} = methods.getValues()
    verifyTokenMutation.mutate({token: emailVerificationCode, identifier: email})
  }

  useEffect(() => clearErrors("emailVerificationCode"), [])

  return (
    <Dialog open={visible} onOpenChange={onCancel}>
      <DialogContent
        type={undefined}
        enableOverflow
        className="[&_.modalsticky]:border-t-subtle [&_.modalsticky]:bg-default max-h-[80vh] pb-0 [&_.modalsticky]:sticky [&_.modalsticky]:bottom-0 [&_.modalsticky]:left-0 [&_.modalsticky]:right-0 [&_.modalsticky]:-mx-8 [&_.modalsticky]:border-t [&_.modalsticky]:px-8 [&_.modalsticky]:py-4">
        <h1 className="font-cal text-emphasis text-xl leading-5">{t("verify_email_email_header")}</h1>
        
        <FormProvider {...methods}>    
          <form onSubmit={methods.handleSubmit(onSubmit)} data-testid="booker-email-verification-form" className="flex flex-col items-end py-5">
            <TextField  
              id="verification-code"
              label={t("email_verification_code")}
              placeholder={t("email_verification_code_placeholder")}
              autoComplete="off"
              required={true}
              className="mb-5"
              containerClassName="w-full"
              error={formState.errors.emailVerificationCode?.message}
              {...register("emailVerificationCode")}
            />
            <Button
             type="submit"
             color="primary"
             className="max-w-fit"
             disabled={formState.isSubmitting}
            >Verify
            </Button>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
