import PaymentPage from "@calcom/ee/modules/payments/components/PaymentPage";
import { getServerSideProps } from "@calcom/ee/modules/payments/pages/payment";
import { inferSSRProps } from "@calcom/types/inferSSRProps";

export default function Payment(props: inferSSRProps<typeof getServerSideProps>) {
  return <PaymentPage {...props} />;
}

export { getServerSideProps };
