import { useState } from "react";
import { useRouter } from "next/router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@calcom/ui";
import { TextField } from "@calcom/ui";

const schema = z.object({
  url: z.string().url().startsWith("https://", { message: "Must be a valid HTTPS URL" }),
});

type FormValues = z.infer<typeof schema>;

export default function ProtonCalendarSetup() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { handleSubmit, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      url: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/integrations/proton/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: [values.url] }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to add Proton Calendar");
      }

      const data = await res.json();
      router.push(data.url || "/apps/installed/calendar");
    } catch (e) {
      setError(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8">
      <h1 className="text-2xl font-bold mb-4">Setup Proton Calendar</h1>
      <p className="mb-4 text-gray-600">
        Paste your Proton Calendar ICS feed URL below. You can find this in Proton Calendar
        settings under Calendar → Share → Create link.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Controller
          name="url"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="ICS Feed URL"
              placeholder="https://calendar.proton.me/..."
              className="w-full"
            />
          )}
        />
        {errors.url && (
          <p className="text-red-500 text-sm">{errors.url.message}</p>
        )}
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save"}
        </Button>
      </form>
    </div>
  );
}
