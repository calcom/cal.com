import React from "react";

import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { FormProvider, useForm } from "react-hook-form";

import { SAMLLogin } from "./SAMLLogin";

// Wrapper component to provide FormProvider context
const SAMLLoginWrapper = (props: React.ComponentProps<typeof SAMLLogin>) => {
  const methods = useForm({
    defaultValues: {
      email: props.email || "",
    },
  });

  return (
    <FormProvider {...methods}>
      <SAMLLogin {...props} />
    </FormProvider>
  );
};

const meta = {
  component: SAMLLoginWrapper,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: {
    samlTenantID: "tenant-123",
    samlProductID: "product-456",
    setErrorMessage: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-[400px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SAMLLoginWrapper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    email: "user@example.com",
  },
};

export const WithValidEmail: Story = {
  args: {
    email: "john.doe@company.com",
  },
};

export const WithInvalidEmail: Story = {
  args: {
    email: "invalid-email",
  },
};

export const EmptyEmail: Story = {
  args: {
    email: "",
  },
};

export const Disabled: Story = {
  args: {
    email: "user@example.com",
    disabled: true,
  },
};

export const Loading: Story = {
  args: {
    email: "user@example.com",
    loading: true,
  },
};

export const WithDifferentColors: Story = {
  render: () => (
    <div className="space-y-4">
      <SAMLLoginWrapper
        samlTenantID="tenant-123"
        samlProductID="product-456"
        setErrorMessage={fn()}
        email="user@example.com"
        color="primary"
      />
      <SAMLLoginWrapper
        samlTenantID="tenant-123"
        samlProductID="product-456"
        setErrorMessage={fn()}
        email="user@example.com"
        color="secondary"
      />
      <SAMLLoginWrapper
        samlTenantID="tenant-123"
        samlProductID="product-456"
        setErrorMessage={fn()}
        email="user@example.com"
        color="minimal"
      />
    </div>
  ),
  parameters: {
    layout: "padded",
  },
};

export const WithDifferentSizes: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <p className="text-xs mb-2 font-medium">Small</p>
        <SAMLLoginWrapper
          samlTenantID="tenant-123"
          samlProductID="product-456"
          setErrorMessage={fn()}
          email="user@example.com"
          size="sm"
        />
      </div>
      <div>
        <p className="text-xs mb-2 font-medium">Base (Default)</p>
        <SAMLLoginWrapper
          samlTenantID="tenant-123"
          samlProductID="product-456"
          setErrorMessage={fn()}
          email="user@example.com"
          size="base"
        />
      </div>
      <div>
        <p className="text-xs mb-2 font-medium">Large</p>
        <SAMLLoginWrapper
          samlTenantID="tenant-123"
          samlProductID="product-456"
          setErrorMessage={fn()}
          email="user@example.com"
          size="lg"
        />
      </div>
    </div>
  ),
  parameters: {
    layout: "padded",
  },
};

export const DifferentTenants: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <p className="text-sm mb-2 font-medium">Company A (SAML)</p>
        <SAMLLoginWrapper
          samlTenantID="company-a-tenant"
          samlProductID="saml-product"
          setErrorMessage={fn()}
          email="user@company-a.com"
        />
      </div>
      <div>
        <p className="text-sm mb-2 font-medium">Company B (OIDC)</p>
        <SAMLLoginWrapper
          samlTenantID="company-b-tenant"
          samlProductID="oidc-product"
          setErrorMessage={fn()}
          email="user@company-b.com"
        />
      </div>
      <div>
        <p className="text-sm mb-2 font-medium">Enterprise Organization</p>
        <SAMLLoginWrapper
          samlTenantID="enterprise-org-tenant"
          samlProductID="enterprise-product"
          setErrorMessage={fn()}
          email="admin@enterprise.org"
        />
      </div>
    </div>
  ),
  parameters: {
    layout: "padded",
  },
};

export const InLoginForm: Story = {
  render: () => {
    const FormExample = () => {
      const methods = useForm({
        defaultValues: {
          email: "user@example.com",
        },
      });

      return (
        <FormProvider {...methods}>
          <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
            <h2 className="text-xl font-semibold">Sign In</h2>
            <div>
              <label className="text-sm font-medium mb-1 block">Email</label>
              <input
                type="email"
                {...methods.register("email")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your email"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Password</label>
              <input
                type="password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your password"
              />
            </div>
            <button
              type="button"
              className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
              Sign In
            </button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>
            <SAMLLogin
              samlTenantID="tenant-123"
              samlProductID="product-456"
              setErrorMessage={fn()}
            />
          </div>
        </FormProvider>
      );
    };

    return <FormExample />;
  },
  parameters: {
    layout: "centered",
  },
};

export const WithErrorHandling: Story = {
  render: () => {
    const ErrorHandlingExample = () => {
      const methods = useForm({
        defaultValues: {
          email: "",
        },
      });
      const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

      return (
        <FormProvider {...methods}>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Email</label>
              <input
                type="email"
                {...methods.register("email")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your email"
              />
            </div>
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
                {errorMessage}
              </div>
            )}
            <SAMLLogin
              samlTenantID="tenant-123"
              samlProductID="product-456"
              setErrorMessage={setErrorMessage}
            />
            <p className="text-xs text-gray-500">Try clicking without entering an email to see error handling</p>
          </div>
        </FormProvider>
      );
    };

    return <ErrorHandlingExample />;
  },
  parameters: {
    layout: "centered",
  },
};
