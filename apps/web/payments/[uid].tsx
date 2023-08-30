import PaymentsPage from "@calcom/features/ee/eventpayment/components/PaymentPage";
import { getServerSideProps } from "@calcom/features/ee/eventpayment/pages/payment";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";

import PageWrapper from "@components/PageWrapper";

export default function Payment(props: inferSSRProps<typeof getServerSideProps>) {
  return <PaymentsPage {...props} />;
}
Payment.PageWrapper = PageWrapper;
export { getServerSideProps };
