import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Button } from "@calcom/ui/components/button";
import { TextField } from "@calcom/ui/components/form";

import AuthContainer from "./AuthContainer";

const meta = {
  component: AuthContainer,
  title: "Web/UI/AuthContainer",
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof AuthContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    showLogo: true,
    heading: "Sign in to your account",
    children: (
      <form className="space-y-4">
        <TextField name="email" label="Email" type="email" placeholder="you@example.com" />
        <TextField name="password" label="Password" type="password" placeholder="••••••••" />
        <Button type="submit" className="w-full">
          Sign in
        </Button>
      </form>
    ),
    footerText: (
      <>
        Don&apos;t have an account?{" "}
        <a href="#" className="text-emphasis hover:underline">
          Sign up
        </a>
      </>
    ),
  },
};

export const WithoutLogo: Story = {
  args: {
    showLogo: false,
    heading: "Welcome back",
    children: (
      <form className="space-y-4">
        <TextField name="email" label="Email" type="email" placeholder="you@example.com" />
        <TextField name="password" label="Password" type="password" placeholder="••••••••" />
        <Button type="submit" className="w-full">
          Continue
        </Button>
      </form>
    ),
  },
};

export const Loading: Story = {
  args: {
    showLogo: true,
    heading: "Sign in",
    loading: true,
    children: (
      <form className="space-y-4">
        <TextField name="email" label="Email" type="email" placeholder="you@example.com" />
        <TextField name="password" label="Password" type="password" placeholder="••••••••" />
        <Button type="submit" className="w-full">
          Sign in
        </Button>
      </form>
    ),
  },
};

export const SignUp: Story = {
  args: {
    showLogo: true,
    heading: "Create your account",
    children: (
      <form className="space-y-4">
        <TextField name="name" label="Full Name" placeholder="John Doe" />
        <TextField name="email" label="Email" type="email" placeholder="you@example.com" />
        <TextField name="password" label="Password" type="password" placeholder="••••••••" />
        <TextField name="confirmPassword" label="Confirm Password" type="password" placeholder="••••••••" />
        <Button type="submit" className="w-full">
          Create account
        </Button>
      </form>
    ),
    footerText: (
      <>
        Already have an account?{" "}
        <a href="#" className="text-emphasis hover:underline">
          Sign in
        </a>
      </>
    ),
  },
};

export const ForgotPassword: Story = {
  args: {
    showLogo: true,
    heading: "Reset your password",
    children: (
      <form className="space-y-4">
        <p className="text-subtle text-sm">
          Enter your email address and we&apos;ll send you a link to reset your password.
        </p>
        <TextField name="email" label="Email" type="email" placeholder="you@example.com" />
        <Button type="submit" className="w-full">
          Send reset link
        </Button>
      </form>
    ),
    footerText: (
      <a href="#" className="text-emphasis hover:underline">
        Back to sign in
      </a>
    ),
  },
};

export const TwoFactorAuth: Story = {
  args: {
    showLogo: true,
    heading: "Two-factor authentication",
    children: (
      <form className="space-y-4">
        <p className="text-subtle text-sm">
          Enter the 6-digit code from your authenticator app.
        </p>
        <TextField
          name="code"
          label="Authentication code"
          placeholder="000000"
          maxLength={6}
          className="text-center tracking-widest"
        />
        <Button type="submit" className="w-full">
          Verify
        </Button>
      </form>
    ),
    footerText: (
      <a href="#" className="text-emphasis hover:underline">
        Use backup code instead
      </a>
    ),
  },
};

export const MinimalContent: Story = {
  args: {
    showLogo: true,
    children: (
      <div className="text-center">
        <h3 className="text-emphasis mb-2 text-lg font-medium">Check your email</h3>
        <p className="text-subtle text-sm">
          We&apos;ve sent a verification link to your email address.
        </p>
      </div>
    ),
  },
};
