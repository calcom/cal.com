export default function SendlySmsSetup() {
  return (
    <div className="p-5">
      <h2 className="text-lg font-semibold mb-3">
        Sendly SMS Notifications
      </h2>
      <p className="text-gray-500 mb-4 leading-relaxed">
        Send SMS confirmations, reminders, and cancellation notices for your
        Cal.com bookings. Sendly is easier to set up than Twilio with built-in
        templates, compliance, and booking-aware features out of the box.
      </p>

      <div className="mb-5">
        <h3 className="text-sm font-semibold mb-2">What you get:</h3>
        <ul className="pl-5 text-gray-500 leading-loose list-disc">
          <li>Automatic SMS when bookings are created, rescheduled, or cancelled</li>
          <li>Pre-meeting SMS reminders (configurable timing)</li>
          <li>Customizable message templates with booking variables</li>
          <li>Multi-attendee support for group bookings</li>
          <li>Activity log to track all sent SMS</li>
        </ul>
      </div>

      <div className="mb-5">
        <h3 className="text-sm font-semibold mb-2">Setup:</h3>
        <ol className="pl-5 text-gray-500 leading-loose list-decimal">
          <li>
            Create a free Sendly account at{" "}
            <a href="https://sendly.live" target="_blank" rel="noopener noreferrer"
              className="text-blue-500 underline">
              sendly.live
            </a>
          </li>
          <li>Get your Sendly API key from Settings &gt; API Keys</li>
          <li>
            Complete the setup at{" "}
            <a href="https://sendly.live/integrations/calcom?source=calcom-appstore"
              target="_blank" rel="noopener noreferrer"
              className="text-blue-500 underline">
              sendly.live/integrations/calcom
            </a>
          </li>
        </ol>
      </div>

      <a
        href="https://sendly.live/integrations/calcom?source=calcom-appstore"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block px-5 py-2.5 bg-blue-500 text-white rounded-md font-medium text-sm no-underline hover:bg-blue-600 transition-colors"
      >
        Complete Setup on Sendly
      </a>

      <div className="mt-5 p-3 bg-gray-100 dark:bg-gray-800 rounded-md">
        <p className="text-[13px] text-gray-500">
          <strong>Pricing:</strong> Sendly charges $0.02/SMS for US numbers.
          No monthly fees, no contracts. Pay only for what you send.
          See full pricing at{" "}
          <a href="https://sendly.live/pricing" target="_blank" rel="noopener noreferrer"
            className="text-blue-500 underline">
            sendly.live/pricing
          </a>
        </p>
      </div>
    </div>
  );
}
