import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { TextField } from "@calcom/ui/components/form";
import { Button } from "@calcom/ui/components/button";
import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui/components/toast";

export default function AppSettings() {
  const { t } = useLocale();
  const [topic, setTopic] = useState("testtopic");
  const [baseUrl, setBaseUrl] = useState("https://ntfy.sh");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const utils = trpc.useUtils();
  const updateAppCredentialsMutation = trpc.viewer.apps.updateAppCredentials.useMutation({
    onSuccess: () => {
      utils.viewer.apps.integrations.invalidate();
      showToast(t("keys_have_been_saved"), "success");
      setLoading(false);
    },
    onError: (error) => {
      showToast(error.message, "error");
      setLoading(false);
    }
  });

  const { data } = trpc.viewer.apps.integrations.useQuery({ appId: "ntfy-sh" });
  const credentialId: number | undefined = data?.items?.find((item) => item.name === "ntfy.sh")?.userCredentialIds?.[0];

  if (!credentialId || credentialId < 0) {
    return <div>No credential found</div>;
  }

  return (
    <div className="stack-y-4 px-4 pb-4 pt-4 text-sm">
      <TextField
        placeholder="Topic name"
        value={topic}
        name="Enter topic name"
        onChange={async (e) => {
          setTopic(e.target.value);
        }}
      />
      <TextField
        placeholder="Ntfy server URL"
        value={baseUrl}
        name="Enter ntfy server url"
        onChange={async (e) => {
          setBaseUrl(e.target.value);
        }}
      />
      <TextField
        placeholder="Username"
        value={username}
        name="Enter username"
        onChange={async (e) => {
          setUsername(e.target.value);
        }}
      />
      <TextField
        placeholder="Password"
        value={password}
        name="Enter password"
        type="password"
        onChange={async (e) => {
          setPassword(e.target.value);
        }}
      />
      <Button onClick={async () => {
        setLoading(true);
        updateAppCredentialsMutation.mutate({
          credentialId, key: { topic, baseUrl, username, password }
        })
      }}
      disabled={loading}>{t("submit")}</Button>
    </div>
  );
}
