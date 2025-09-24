import { Button } from "@calcom/ui/components/button";
import { Icon } from "@calcom/ui/components/icon";

export default function LawPaySupportPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <Icon name="mail" className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Contact Support</h2>
          <p className="mt-2 text-sm text-gray-600">
            If you need help, please reach out to our support team.
          </p>
        </div>
        <div className="mt-8 space-y-4">
          <Button
            onClick={() => (window.location.href = "mailto:support@example.com")}
            className="flex w-full justify-center px-4 py-2"
            color="primary">
            Email Support
          </Button>
        </div>
      </div>
    </div>
  );
}
