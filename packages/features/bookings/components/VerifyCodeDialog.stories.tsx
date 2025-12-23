import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import type { StoreApi } from "zustand";

import { BookerStoreContext } from "../Booker/BookerStoreProvider";
import type { BookerStore } from "../Booker/store";
import { VerifyCodeDialog } from "./VerifyCodeDialog";

// Mock BookerStore for Storybook
const createMockStore = (): StoreApi<BookerStore> => {
  let verificationCode: string | null = null;

  return {
    getState: () =>
      ({
        verificationCode,
        setVerificationCode: (code: string | null) => {
          verificationCode = code;
        },
      }) as BookerStore,
    setState: () => {},
    subscribe: () => () => {},
    destroy: () => {},
  } as unknown as StoreApi<BookerStore>;
};

const meta = {
  component: VerifyCodeDialog,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => {
      const mockStore = createMockStore();
      return (
        <BookerStoreContext.Provider value={mockStore}>
          <Story />
        </BookerStoreContext.Provider>
      );
    },
  ],
  argTypes: {
    isOpenDialog: {
      control: "boolean",
      description: "Controls whether the dialog is open",
    },
    email: {
      control: "text",
      description: "Email address to verify",
    },
    isUserSessionRequiredToVerify: {
      control: "boolean",
      description: "Whether user session is required for verification",
    },
    isPending: {
      control: "boolean",
      description: "Loading state during verification",
    },
    error: {
      control: "text",
      description: "Error message to display",
    },
  },
} satisfies Meta<typeof VerifyCodeDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: function DefaultStory() {
    const [isOpenDialog, setIsOpenDialog] = useState(true);
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState("");

    const verifyCodeWithSessionNotRequired = (code: string, email: string) => {
      console.log("Verifying code (no session required):", code, email);
      setTimeout(() => {
        setIsPending(false);
        setIsOpenDialog(false);
      }, 1000);
    };

    const verifyCodeWithSessionRequired = (code: string, email: string) => {
      console.log("Verifying code (session required):", code, email);
      setTimeout(() => {
        setIsPending(false);
        setIsOpenDialog(false);
      }, 1000);
    };

    const resetErrors = () => {
      setError("");
    };

    return (
      <>
        <button
          onClick={() => setIsOpenDialog(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          Open Verify Code Dialog
        </button>
        <VerifyCodeDialog
          isOpenDialog={isOpenDialog}
          setIsOpenDialog={setIsOpenDialog}
          email="user@example.com"
          isUserSessionRequiredToVerify={true}
          verifyCodeWithSessionNotRequired={verifyCodeWithSessionNotRequired}
          verifyCodeWithSessionRequired={verifyCodeWithSessionRequired}
          resetErrors={resetErrors}
          setIsPending={setIsPending}
          isPending={isPending}
          error={error}
        />
      </>
    );
  },
};

export const WithError: Story = {
  render: function WithErrorStory() {
    const [isOpenDialog, setIsOpenDialog] = useState(true);
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState("Invalid verification code. Please try again.");

    const verifyCodeWithSessionNotRequired = (code: string, email: string) => {
      console.log("Verifying code (no session required):", code, email);
      setIsPending(true);
      setTimeout(() => {
        setIsPending(false);
        setError("Invalid verification code. Please try again.");
      }, 1000);
    };

    const verifyCodeWithSessionRequired = (code: string, email: string) => {
      console.log("Verifying code (session required):", code, email);
      setIsPending(true);
      setTimeout(() => {
        setIsPending(false);
        setError("Invalid verification code. Please try again.");
      }, 1000);
    };

    const resetErrors = () => {
      setError("");
    };

    return (
      <>
        <button
          onClick={() => setIsOpenDialog(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          Open Verify Code Dialog (With Error)
        </button>
        <VerifyCodeDialog
          isOpenDialog={isOpenDialog}
          setIsOpenDialog={setIsOpenDialog}
          email="user@example.com"
          isUserSessionRequiredToVerify={true}
          verifyCodeWithSessionNotRequired={verifyCodeWithSessionNotRequired}
          verifyCodeWithSessionRequired={verifyCodeWithSessionRequired}
          resetErrors={resetErrors}
          setIsPending={setIsPending}
          isPending={isPending}
          error={error}
        />
      </>
    );
  },
};

export const Loading: Story = {
  render: function LoadingStory() {
    const [isOpenDialog, setIsOpenDialog] = useState(true);
    const [isPending, setIsPending] = useState(true);
    const [error, setError] = useState("");

    const verifyCodeWithSessionNotRequired = (code: string, email: string) => {
      console.log("Verifying code (no session required):", code, email);
      setIsPending(true);
    };

    const verifyCodeWithSessionRequired = (code: string, email: string) => {
      console.log("Verifying code (session required):", code, email);
      setIsPending(true);
    };

    const resetErrors = () => {
      setError("");
    };

    return (
      <>
        <button
          onClick={() => setIsOpenDialog(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          Open Verify Code Dialog (Loading)
        </button>
        <VerifyCodeDialog
          isOpenDialog={isOpenDialog}
          setIsOpenDialog={setIsOpenDialog}
          email="user@example.com"
          isUserSessionRequiredToVerify={true}
          verifyCodeWithSessionNotRequired={verifyCodeWithSessionNotRequired}
          verifyCodeWithSessionRequired={verifyCodeWithSessionRequired}
          resetErrors={resetErrors}
          setIsPending={setIsPending}
          isPending={isPending}
          error={error}
        />
      </>
    );
  },
};

export const NoSessionRequired: Story = {
  render: function NoSessionRequiredStory() {
    const [isOpenDialog, setIsOpenDialog] = useState(true);
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState("");

    const verifyCodeWithSessionNotRequired = (code: string, email: string) => {
      console.log("Verifying code (no session required):", code, email);
      setIsPending(true);
      setTimeout(() => {
        setIsPending(false);
        setIsOpenDialog(false);
      }, 1000);
    };

    const verifyCodeWithSessionRequired = (code: string, email: string) => {
      console.log("Verifying code (session required):", code, email);
      setIsPending(true);
      setTimeout(() => {
        setIsPending(false);
        setIsOpenDialog(false);
      }, 1000);
    };

    const resetErrors = () => {
      setError("");
    };

    return (
      <>
        <button
          onClick={() => setIsOpenDialog(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          Open Verify Code Dialog (No Session Required)
        </button>
        <VerifyCodeDialog
          isOpenDialog={isOpenDialog}
          setIsOpenDialog={setIsOpenDialog}
          email="guest@example.com"
          isUserSessionRequiredToVerify={false}
          verifyCodeWithSessionNotRequired={verifyCodeWithSessionNotRequired}
          verifyCodeWithSessionRequired={verifyCodeWithSessionRequired}
          resetErrors={resetErrors}
          setIsPending={setIsPending}
          isPending={isPending}
          error={error}
        />
      </>
    );
  },
};

export const LongEmail: Story = {
  render: function LongEmailStory() {
    const [isOpenDialog, setIsOpenDialog] = useState(true);
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState("");

    const verifyCodeWithSessionNotRequired = (code: string, email: string) => {
      console.log("Verifying code (no session required):", code, email);
      setIsPending(true);
      setTimeout(() => {
        setIsPending(false);
        setIsOpenDialog(false);
      }, 1000);
    };

    const verifyCodeWithSessionRequired = (code: string, email: string) => {
      console.log("Verifying code (session required):", code, email);
      setIsPending(true);
      setTimeout(() => {
        setIsPending(false);
        setIsOpenDialog(false);
      }, 1000);
    };

    const resetErrors = () => {
      setError("");
    };

    return (
      <>
        <button
          onClick={() => setIsOpenDialog(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          Open Verify Code Dialog (Long Email)
        </button>
        <VerifyCodeDialog
          isOpenDialog={isOpenDialog}
          setIsOpenDialog={setIsOpenDialog}
          email="very.long.email.address.for.testing.purposes@example-domain.com"
          isUserSessionRequiredToVerify={true}
          verifyCodeWithSessionNotRequired={verifyCodeWithSessionNotRequired}
          verifyCodeWithSessionRequired={verifyCodeWithSessionRequired}
          resetErrors={resetErrors}
          setIsPending={setIsPending}
          isPending={isPending}
          error={error}
        />
      </>
    );
  },
};

export const AutoVerify: Story = {
  render: function AutoVerifyStory() {
    const [isOpenDialog, setIsOpenDialog] = useState(true);
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const verifyCodeWithSessionNotRequired = (code: string, email: string) => {
      console.log("Auto-verifying code (no session required):", code, email);
      setIsPending(true);
      setTimeout(() => {
        setIsPending(false);
        setIsOpenDialog(false);
        setMessage(`Successfully verified code: ${code} for ${email}`);
      }, 1500);
    };

    const verifyCodeWithSessionRequired = (code: string, email: string) => {
      console.log("Auto-verifying code (session required):", code, email);
      setIsPending(true);
      setTimeout(() => {
        setIsPending(false);
        setIsOpenDialog(false);
        setMessage(`Successfully verified code: ${code} for ${email}`);
      }, 1500);
    };

    const resetErrors = () => {
      setError("");
    };

    return (
      <>
        <div className="space-y-4">
          <button
            onClick={() => {
              setIsOpenDialog(true);
              setMessage("");
            }}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
            Open Verify Code Dialog (Auto-verify on 6 digits)
          </button>
          {message && <p className="text-sm text-green-600">{message}</p>}
        </div>
        <VerifyCodeDialog
          isOpenDialog={isOpenDialog}
          setIsOpenDialog={setIsOpenDialog}
          email="user@example.com"
          isUserSessionRequiredToVerify={true}
          verifyCodeWithSessionNotRequired={verifyCodeWithSessionNotRequired}
          verifyCodeWithSessionRequired={verifyCodeWithSessionRequired}
          resetErrors={resetErrors}
          setIsPending={setIsPending}
          isPending={isPending}
          error={error}
        />
      </>
    );
  },
};
