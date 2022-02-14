import PaymentPage from "@ee/components/stripe/PaymentPage";
import { getServerSideProps } from "@ee/pages/payment/[uid]";

import { inferSSRProps } from "@lib/types/inferSSRProps";

export default function Payment(props: inferSSRProps<typeof getServerSideProps>) {
  return <PaymentPage {...props} />;
}

export { getServerSideProps };
