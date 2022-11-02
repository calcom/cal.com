import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import { NewTeamData } from "@calcom/features/ee/teams/lib/types";
import { CAL_URL } from "@calcom/lib/constants";
import { trpc } from "@calcom/trpc/react";
import { Switch, Button } from "@calcom/ui/v2";

const PurchaseNewTeam = ({
  paymentIntent,
  clientSecret,
  total,
  billingFrequency,
  newTeamData,
}: {
  paymentIntent: string;
  clientSecret: string;
  total: number;
  billingFrequency: string;
  newTeamData: NewTeamData;
}) => {
  const [errorMessage, setErrorMessage] = useState("");
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();

  const createTeamMutation = trpc.useMutation(["viewer.teams.createTeam"], {
    onSuccess: (data) => {
      router.push(`${CAL_URL}/settings/teams/${data.id}/profile`);
    },
  });

  const handleSubmit = async () => {
    if (!stripe || !elements) return;

    setPaymentProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${CAL_URL}/settings/profile`,
      },
      redirect: "if_required",
    });

    if (error) {
      console.log("🚀 ~ file: PurchaseNewTeam.tsx ~ line 71 ~ handleSubmit ~ error", error);
    } else {
      createTeamMutation.mutate(newTeamData);
    }
  };

  return (
    <>
      <PaymentElement />
      <Button
        className="mt-4 w-full justify-center"
        loading={paymentProcessing}
        onClick={() => handleSubmit()}>
        Pay ${total} / {billingFrequency}
      </Button>
      <p>Error processing payment: {errorMessage}</p>
    </>
  );
};

export default dynamic(() => Promise.resolve(PurchaseNewTeam), {
  ssr: false,
});
