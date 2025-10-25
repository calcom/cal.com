import Link from "next/link";

import { Button } from "@calcom/ui/components/button";

export default function ZapierSetup() {
  return (
    <div className="bg-emphasis flex h-screen items-center justify-center p-4">
      <div className="text-center">
        <p className="mb-4 text-lg font-medium">Integrate Cal.com with Zapier in a few clicks.</p>
        <Link href="https://zapier.com/apps/calcom/integrations" passHref>
          <Button color="secondary" size="lg">
            Go to Zapier Integration
          </Button>
        </Link>
        <p className="text-subtle mt-3 text-sm">You’ll be redirected to Zapier to complete the setup.</p>
      </div>
    </div>
  );
}
