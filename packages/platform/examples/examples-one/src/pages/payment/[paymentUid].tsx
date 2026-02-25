import { PaymentForm } from "@calcom/atoms";
import { Inter } from "next/font/google";
import { usePathname, useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export default function Payment(props: { calUsername: string; calEmail: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const uid = pathname.split("/").pop();

  return (
    <main className={`flex min-h-screen flex-col ${inter.className}`}>
      <Navbar username={props.calUsername} />
      <PaymentForm
        paymentUid={uid ?? ""}
        onPaymentSuccess={() => {
          router.push("/bookings");
        }}
        onPaymentCancellation={() => {
          router.back();
        }}
      />
    </main>
  );
}
