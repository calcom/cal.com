/**
 * Cal.com App Store setup component for Sendly SMS.
 *
 * This component is rendered inside Cal.com's app settings page
 * when a user installs the Sendly SMS app. It guides them to
 * complete the setup on the Sendly dashboard.
 */
export default function SendlySmsSetup() {
  return (
    <div style={{ padding: "20px" }}>
      <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "12px" }}>
        Sendly SMS Notifications
      </h2>
      <p style={{ color: "#6b7280", marginBottom: "16px", lineHeight: 1.6 }}>
        Send SMS confirmations, reminders, and cancellation notices for your
        Cal.com bookings. Sendly is easier to set up than Twilio with built-in
        templates, compliance, and booking-aware features out of the box.
      </p>

      <div style={{ marginBottom: "20px" }}>
        <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>
          What you get:
        </h3>
        <ul style={{ paddingLeft: "20px", color: "#6b7280", lineHeight: 1.8 }}>
          <li>Automatic SMS when bookings are created, rescheduled, or cancelled</li>
          <li>Pre-meeting SMS reminders (configurable timing)</li>
          <li>Customizable message templates with booking variables</li>
          <li>Multi-attendee support for group bookings</li>
          <li>Activity log to track all sent SMS</li>
        </ul>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>
          Setup:
        </h3>
        <ol style={{ paddingLeft: "20px", color: "#6b7280", lineHeight: 1.8 }}>
          <li>
            Create a free Sendly account at{" "}
            <a href="https://sendly.live" target="_blank" rel="noopener noreferrer"
              style={{ color: "#3b82f6", textDecoration: "underline" }}>
              sendly.live
            </a>
          </li>
          <li>Get your Sendly API key from Settings &gt; API Keys</li>
          <li>
            Complete the setup at{" "}
            <a href="https://sendly.live/integrations/calcom?source=calcom-appstore"
              target="_blank" rel="noopener noreferrer"
              style={{ color: "#3b82f6", textDecoration: "underline" }}>
              sendly.live/integrations/calcom
            </a>
          </li>
        </ol>
      </div>

      <a
        href="https://sendly.live/integrations/calcom?source=calcom-appstore"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-block",
          padding: "10px 20px",
          backgroundColor: "#3b82f6",
          color: "white",
          borderRadius: "6px",
          textDecoration: "none",
          fontWeight: 500,
          fontSize: "14px",
        }}
      >
        Complete Setup on Sendly
      </a>

      <div style={{ marginTop: "20px", padding: "12px", backgroundColor: "#f3f4f6", borderRadius: "6px" }}>
        <p style={{ fontSize: "13px", color: "#6b7280" }}>
          <strong>Pricing:</strong> Sendly charges $0.02/SMS for US numbers.
          No monthly fees, no contracts. Pay only for what you send.
          See full pricing at{" "}
          <a href="https://sendly.live/pricing" target="_blank" rel="noopener noreferrer"
            style={{ color: "#3b82f6", textDecoration: "underline" }}>
            sendly.live/pricing
          </a>
        </p>
      </div>
    </div>
  );
}
