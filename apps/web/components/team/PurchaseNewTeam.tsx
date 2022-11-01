import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { NewTeamData } from "@calcom/features/ee/teams/lib/types";
import { trpc } from "@calcom/trpc/react";
import { Switch, Button } from "@calcom/ui/v2";

const PurchaseNewTeam = ({
  newTeamData,
  paymentIntent,
  clientSecret,
  teamPrices,
}: {
  newTeamData: NewTeamData;
  paymentIntent: string;
  clientSecret: string;
  teamPrices: {
    monthly: number;
    yearly: number;
  };
}) => {
  const [message, setMessage] = useState("");
  const [billingFrequency, setBillingFrequency] = useState("monthly");
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const stripe = useStripe();
  const elements = useElements();

  const updatePaymentIntentMutation = trpc.useMutation(["viewer.teams.mutatePaymentIntent"]);

  // Handle Stripe payment
  useEffect(() => {
    if (!stripe) {
      return;
    }

    if (!paymentIntent) {
      return;
    }

    stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
      switch (paymentIntent.status) {
        case "succeeded":
          setMessage("Payment succeeded!");
          break;
        case "processing":
          setMessage("Your payment is processing.");
          break;
        case "requires_payment_method":
          setMessage("Your payment was not successful, please try again.");
          break;
        default:
          setMessage("Something went wrong.");
          break;
      }
    });
  }, [stripe]);

  return (
    <>
      {/* <div className="flex justify-between">
        <p>Total</p>
        <div>
          <p>
            {newTeamData.members.length} members x ${teamPrices[billingFrequency as keyof typeof teamPrices]}{" "}
            / {billingFrequency} ={" "}
            {newTeamData.members.length * teamPrices[billingFrequency as keyof typeof teamPrices]}
          </p>
        </div>
      </div>
      <hr />
      <div className="mt-4 flex space-x-2">
        <Switch onClick={() => setBillingFrequency(billingFrequency === "monthly" ? "yearly" : "monthly")} />
        <p>
          Switch to yearly and save{" "}
          {newTeamData.members.length * (teamPrices.monthly * 12 - teamPrices.yearly)}
        </p>
      </div> */}
      <hr className="my-4" />
      <PaymentElement />

      <Button
        className="mt-4 w-full justify-center"
        loading={paymentProcessing}
        onClick={() => handleSubmit()}>
        Pay ${teamPrices[billingFrequency as keyof typeof teamPrices]}
      </Button>
    </>
  );
};

export default dynamic(() => Promise.resolve(PurchaseNewTeam), {
  ssr: false,
});
