import Link from "next/link";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

export const ProCard = () => {
  return (
    <Card className="mx-auto max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">You&apos;re a professional?</CardTitle>
        <CardDescription>
          Sign up & connect your calendar to get bookings from our marketplace.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <Link href="/signup">
            <Button className="w-full">Sign Up</Button>
          </Link>
        </div>
        <div className="mt-4 text-center text-sm">
          Already have an account?{" "}
          <Link href="/login" className="underline">
            Log in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};
export default ProCard;
