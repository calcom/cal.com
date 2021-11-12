import PaymentPage from "ce/components/stripe/PaymentPage";
import { getServerSideProps } from "ce/pages/payment/[uid]";

import { inferSSRProps } from "@lib/types/inferSSRProps";

export default function Payment(props: inferSSRProps<typeof getServerSideProps>) {
  return <PaymentPage {...props} />;
}

export { getServerSideProps };
