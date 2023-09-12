import PaymentPage from "@calcom/features/ee/payments/components/PaymentPage";
import { getServerSideProps } from "@calcom/features/ee/payments/pages/payment";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";

import PageWrapper from "@components/PageWrapper";

export default function Payment(props: inferSSRProps<typeof getServerSideProps>) {
  return <PaymentPage {...props} />;
}
Payment.PageWrapper = PageWrapper;
export { getServerSideProps };
