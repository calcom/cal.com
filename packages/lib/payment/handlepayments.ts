import { PaymentServiceEvent } from "@calcom/app-store/stripepayment/lib/PaymentServiceEvent";
import type { EventTypeModel } from "@calcom/prisma/zod";

const handlePayments = async (
  selectedEventType: Pick<Zod.infer<typeof EventTypeModel>, "metadata">,

  // paymentAppCredentials: {
  //   key: Prisma.JsonValue;
  //   appId: EventTypeAppsList;
  //   app: {
  //     dirName: string;
  //     categories: AppCategories[];
  //   } | null;
  // },
  booking: {
    user: { email: string | null; name: string | null; timeZone: string } | null;
    id: number;
    startTime?: { toISOString: () => string };
    uid: string;
    title: string;
    amount: number;
  },
  bookerEmail: string
) => {
  // const paymentApp = (await appStore[
  //   paymentAppCredentials?.app?.dirName as keyof typeof appStore
  // ]()) as PaymentApp;
  // if (!paymentApp?.lib?.PaymentService) {
  //   console.warn(`payment App service of type ${paymentApp} is not implemented`);
  //   return null;
  // }
  // const PaymentService = paymentApp.lib.PaymentService as any;
  // console.log("ps");

  const paymentInstance = new PaymentServiceEvent();

  // if (paymentOption === "HOLD") {
  //   paymentData = await paymentInstance.collectCard(
  //     {
  //       amount: selectedEventType?.metadata?.apps?.[paymentAppCredentials.appId].price,
  //       currency: selectedEventType?.metadata?.apps?.[paymentAppCredentials.appId].currency,
  //     },
  //     booking.id,
  //     bookerEmail,
  //     paymentOption
  //   );
  // } else {
  console.log(booking.amount);
  const paymentData = await paymentInstance.create(
    {
      amount: booking.amount,
    },
    booking.id,
    bookerEmail,
    booking.title
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
