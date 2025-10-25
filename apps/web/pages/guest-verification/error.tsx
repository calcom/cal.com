import { useRouter } from "next/router";

export default function GuestVerificationError() {
  const router = useRouter();
  const { reason } = router.query;

  const getErrorMessage = () => {
    switch (reason) {
      case "expired":
        return "The verification link has expired. Please contact the meeting organizer.";
      case "invalid":
        return "The verification link is invalid. Please check your email for the correct link.";
      case "already_verified":
        return "This email has already been verified.";
      case "booking_cancelled":
        return "The booking has been cancelled.";
      default:
        return "An error occurred during verification. Please try again or contact support.";
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-lg">
        <svg className="mx-auto mb-4 h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Verification Failed</h1>
        <p className="text-gray-600">{getErrorMessage()}</p>
        <p className="mt-4 text-sm text-gray-500">You&apos;ve not been added to the meeting.</p>
      </div>
    </div>
  );
}
