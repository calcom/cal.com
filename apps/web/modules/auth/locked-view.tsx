"use client";

import { Button } from "@calid/features/ui/components/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@calid/features/ui/components/card";
import { Icon } from "@calid/features/ui/components/icon";
import { Logo } from "@calid/features/ui/components/logo";

const SUPPORT_EMAIL = "support@onehash.ai";

export default function LockedAccountView() {
  return (
    <div className="dark:bg-default flex min-h-screen flex-col items-center justify-center bg-[#F0F5FF] p-4">
      <Card className="bg-default dark:border-gray-550 w-full max-w-[600px] overflow-hidden rounded-3xl border shadow-xl dark:shadow-none">
        <CardHeader className="items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
            <Icon name="lock" className="h-6 w-6" />
          </div>
          <CardTitle className="text-default text-xl font-semibold">Account locked</CardTitle>
          <CardDescription className="text-subtle text-center">
            Your account has been locked. Please contact support to continue.
          </CardDescription>
        </CardHeader>
        <CardContent />
        <CardFooter className="justify-center pb-6">
          <Button color="primary" asChild>
            <a href={`mailto:${SUPPORT_EMAIL}`}>Contact Support</a>
          </Button>
        </CardFooter>
      </Card>
      <div className="mt-8">
        <Logo small icon />
      </div>
    </div>
  );
}
