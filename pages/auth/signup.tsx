import { HeadSeo } from "@components/seo/head-seo";
import { useRouter } from "next/router";
import { signIn } from "next-auth/client";
import ErrorAlert from "@components/ui/alerts/Error";
import { useState } from "react";
import { UsernameInput } from "@components/ui/UsernameInput";
import prisma from "@lib/prisma";

export default function Signup(props) {
  const router = useRouter();

  const [hasErrors, setHasErrors] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleErrors = async (resp) => {
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.message);
    }
  };

  const signUp = (e) => {
    e.preventDefault();

    if (e.target.password.value !== e.target.passwordcheck.value) {
      throw new Error("Password mismatch");
    }

    const email: string = e.target.email.value;
    const password: string = e.target.password.value;

    fetch("/api/auth/signup", {
      body: JSON.stringify({
        username: e.target.username.value,
        password,
        email,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    })
      .then(handleErrors)
      .then(() => signIn("Calendso", { callbackUrl: (router.query.callbackUrl || "") as string }))
      .catch((err) => {
        setHasErrors(true);
        setErrorMessage(err.message);
      });
  };

  return (
    <div
      className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true">
      <HeadSeo title="Sign up" description="Sign up" />
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-3xl font-extrabold text-gray-900">Create your account</h2>
      </div>
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow mx-2 sm:rounded-lg sm:px-10">
          <form method="POST" onSubmit={signUp} className="bg-white space-y-6">
            {hasErrors && <ErrorAlert message={errorMessage} />}
            <div>
              <div className="mb-2">
                <UsernameInput required />
              </div>
              <div className="mb-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  placeholder="jdoe@example.com"
                  disabled={!!props.email}
                  readOnly={!!props.email}
                  value={props.email}
                  className="bg-gray-100 mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                />
              </div>
              <div className="mb-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  id="password"
                  required
                  placeholder="•••••••••••••"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="passwordcheck" className="block text-sm font-medium text-gray-700">
                  Confirm password
                </label>
                <input
                  type="password"
                  name="passwordcheck"
                  id="passwordcheck"
                  required
                  placeholder="•••••••••••••"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                />
              </div>
            </div>
            <div className="mt-3 sm:mt-4 flex">
              <input
                type="submit"
                value="Create Account"
                className="btn btn-primary w-7/12 mr-2 inline-flex justify-center rounded-md border border-transparent cursor-pointer shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black sm:text-sm"
              />
              <a
                onClick={() =>
                  signIn("Calendso", { callbackUrl: (router.query.callbackUrl || "") as string })
                }
                className="w-5/12 inline-flex justify-center text-sm text-gray-500 font-medium  border px-4 py-2 rounded btn cursor-pointer">
                Login instead
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export async function getServerSideProps(ctx) {
  if (!ctx.query.token) {
    return {
      notFound: true,
    };
  }
  const verificationRequest = await prisma.verificationRequest.findUnique({
    where: {
      token: ctx.query.token,
    },
  });

  // for now, disable if no verificationRequestToken given or token expired
  if (!verificationRequest || verificationRequest.expires < new Date()) {
    return {
      notFound: true,
    };
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      AND: [
        {
          email: verificationRequest.identifier,
        },
        {
          emailVerified: {
            not: null,
          },
        },
      ],
    },
  });

  if (existingUser) {
    return {
      redirect: { permanent: false, destination: "/auth/login?callbackUrl=" + ctx.query.callbackUrl },
    };
  }

  return { props: { email: verificationRequest.identifier } };
}
