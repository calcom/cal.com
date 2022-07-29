import PaymentPage from "@calcom/features/ee/payments/components/PaymentPage";
import { getServerSideProps } from "@calcom/features/ee/payments/pages/payment";
import { inferSSRProps } from "@calcom/types/inferSSRProps";

export default function Payment(props: inferSSRProps<typeof getServerSideProps>) {
  return <PaymentPage {...props} />;
}

export { getServerSideProps };
