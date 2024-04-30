"use client";
import { signInWithCredentials } from "~/app/_actions";
import { ButtonSubmit } from "~/app/_components/submit-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useFormState } from "react-dom";
import Link from "next/link";

export function LoginForm() {
  const [error, dispatch] = useFormState<{ error?: string | null }>(
    // @ts-expect-error - unsure why the types are wrong here?
    signInWithCredentials,
    { error: null },
  );

  return (
    <form action={dispatch}>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Enter your email below to login in to your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="m@example.com"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required />
          </div>
          <input hidden name="redirectTo" value="/dashboard/getting-started" />
        </CardContent>
        <CardFooter>
          <div className="flex flex-col w-full">
            <ButtonSubmit variant="default" className="w-full">
              Log in
            </ButtonSubmit>
            <div className="mt-4 text-center text-sm">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="underline">
                Sign up
              </Link>
              {" "}instead.
            </div>
          </div>
        </CardFooter>
      </Card>
    </form>
  );
}
