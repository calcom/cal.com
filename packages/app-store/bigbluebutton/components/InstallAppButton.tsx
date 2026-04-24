import type { InstallAppButtonProps } from "@calcom/app-store/types";
import { useState } from "react";
import { TextField, Button, Alert } from "@calcom/ui";

export default function InstallAppButton(props: InstallAppButtonProps) {
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Test connection before saving
      const testResponse = await fetch(
        `/api/integrations/bigbluebutton/check?url=${encodeURIComponent(url)}&secret=${encodeURIComponent(secret)}`
      );

      const testData = await testResponse.json();

      if (!testResponse.ok || testData.status !== "connected") {
        throw new Error(testData.message || "Failed to connect to BigBlueButton server");
      }

      // Save credentials
      const response = await fetch("/api/integrations/bigbluebutton/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, secret }),
      });

      if (!response.ok) {
        throw new Error("Failed to save credentials");
      }

      setSuccess(true);
      props.onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Connect BigBlueButton</h3>
        <p className="text-sm text-gray-500">
          Enter your BigBlueButton server details to enable video conferencing.
        </p>
      </div>

      {error && (
        <Alert severity="error" title="Connection Error">
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" title="Connected">
          Successfully connected to BigBlueButton server!
        </Alert>
      )}

      <TextField
        label="Server URL"
        placeholder="https://bbb.example.com"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        required
        hint="Your BigBlueButton server URL"
      />

      <TextField
        label="Shared Secret"
        type="password"
        placeholder="Your BBB shared secret"
        value={secret}
        onChange={(e) => setSecret(e.target.value)}
        required
        hint="Get this from 'bbb-conf --secret' on your BBB server"
      />

      <div className="text-sm text-gray-500">
        <p>Need help?</p>
        <ul className="list-disc list-inside">
          <li>
            <a
              href="https://docs.bigbluebutton.org/administration/install/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              Install BigBlueButton
            </a>
          </li>
          <li>
            Run <code>bbb-conf --secret</code> on your BBB server to get the secret
          </li>
        </ul>
      </div>

      <Button type="submit" loading={isLoading} disabled={success}>
        {success ? "Connected" : "Connect BigBlueButton"}
      </Button>
    </form>
  );
}
