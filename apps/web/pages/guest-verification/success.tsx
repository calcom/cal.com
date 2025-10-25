export default function GuestVerificationSuccess() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-lg">
        <svg className="mx-auto mb-4 h-16 w-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Email Verified!</h1>
        <p className="text-gray-600">
          You&apos;ve been successfully added to the meeting. Check your email for the meeting details.
        </p>
      </div>
    </div>
  );
}
