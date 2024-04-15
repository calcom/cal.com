"use server";
import { AuthError } from "next-auth";
import { isRedirectError } from "next/dist/client/components/redirect";
import { signIn } from "~/auth";

export async function signInWithCredentials(
  _prevState: { error?: string | null },
  formData: FormData,
) {
  try {
    await signIn("credentials", formData);
  } catch (error) {
    if (isRedirectError(error)) throw error;

    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid credentials." };
        default:
          return { error: "Something went wrong." };
      }
    }
    console.error("Uncaught error signing in", error);
    throw error;
  }
}
