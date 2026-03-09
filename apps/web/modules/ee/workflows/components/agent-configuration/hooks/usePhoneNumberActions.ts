import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import type { PhoneNumberFormValues } from "../types/schemas";
import { phoneNumberFormSchema } from "../types/schemas";

export function usePhoneNumberActions() {
  const [cancellingNumberId, setCancellingNumberId] = useState<number | null>(null);
  const [numberToDelete, setNumberToDelete] = useState<string | null>(null);

  const phoneNumberForm = useForm<PhoneNumberFormValues>({
    resolver: zodResolver(phoneNumberFormSchema),
    defaultValues: {
      phoneNumber: "",
      terminationUri: "",
      sipTrunkAuthUsername: "",
      sipTrunkAuthPassword: "",
      nickname: "",
    },
  });

  const handleCancelSubscription = (phoneNumberId: number) => {
    setCancellingNumberId(phoneNumberId);
  };

  const handleDeletePhoneNumber = (phoneNumber: string) => {
    setNumberToDelete(phoneNumber);
  };

  return {
    phoneNumberForm,
    cancellingNumberId,
    setCancellingNumberId,
    numberToDelete,
    setNumberToDelete,
    handleCancelSubscription,
    handleDeletePhoneNumber,
  };
}
