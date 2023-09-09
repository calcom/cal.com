import { PaymentServiceEvent } from "@calcom/app-store/stripepayment/lib/PaymentServiceEvent";

const handlePayments = async (
  booking: {
    id: number;
    title: string;
    amount: number;
    slug: string;
  },
  bookerEmail: string,
  username: string
) => {
  const paymentInstance = new PaymentServiceEvent();
  const paymentData = await paymentInstance.create(
    {
      amount: booking.amount,
    },
    booking.id,
    bookerEmail,
    booking.title,
    booking.slug,
    username
  );

  if (!paymentData) {
    console.error("Payment data is null");
    throw new Error("Payment data is null");
  }
  // try {
  //   await paymentInstance.afterPayment(evt, booking, paymentData);
  // } catch (e) {
  //   console.error(e);
  // }
  return paymentData;
};

export { handlePayments };
