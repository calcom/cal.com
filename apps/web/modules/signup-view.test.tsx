import { zodResolver } from "@hookform/resolvers/zod";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, FormProvider } from "react-hook-form";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { signupSchema as apiSignupSchema } from "@calcom/prisma/zod-utils";

const signupSchema = apiSignupSchema.extend({
  apiError: z.string().optional(),
  cfToken: z.string().optional(),
});

type FormValues = z.infer<typeof signupSchema>;

function TestSignupForm() {
  const formMethods = useForm<FormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
    },
    mode: "onTouched",
  });

  const {
    register,
    formState: { errors },
  } = formMethods;

  return (
    <FormProvider {...formMethods}>
      <form>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" data-testid="email-input" {...register("email")} />
        {errors.email && <span data-testid="email-error">{errors.email.message}</span>}

        <label htmlFor="password">Password</label>
        <input id="password" type="password" data-testid="password-input" {...register("password")} />
        {errors.password && <span data-testid="password-error">{errors.password.message}</span>}
      </form>
    </FormProvider>
  );
}

describe("Signup form validation mode", () => {
  it("should not show email error while user is still typing", async () => {
    const user = userEvent.setup();
    render(<TestSignupForm />);

    const emailInput = screen.getByTestId("email-input");
    await user.type(emailInput, "test");

    expect(screen.queryByTestId("email-error")).not.toBeInTheDocument();
  });

  it("should show email error after the field is blurred with invalid value", async () => {
    const user = userEvent.setup();
    render(<TestSignupForm />);

    const emailInput = screen.getByTestId("email-input");
    await user.type(emailInput, "invalid-email");
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.getByTestId("email-error")).toBeInTheDocument();
    });
  });

  it("should not show email error if field is blurred with valid email", async () => {
    const user = userEvent.setup();
    render(<TestSignupForm />);

    const emailInput = screen.getByTestId("email-input");
    await user.type(emailInput, "test@example.com");
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.queryByTestId("email-error")).not.toBeInTheDocument();
    });
  });

  it("should revalidate on each keystroke after the field has been touched and blurred", async () => {
    const user = userEvent.setup();
    render(<TestSignupForm />);

    const emailInput = screen.getByTestId("email-input");

    await user.type(emailInput, "bad");
    fireEvent.blur(emailInput);
    await waitFor(() => {
      expect(screen.getByTestId("email-error")).toBeInTheDocument();
    });

    await user.clear(emailInput);
    await user.type(emailInput, "valid@email.com");
    await waitFor(() => {
      expect(screen.queryByTestId("email-error")).not.toBeInTheDocument();
    });
  });
});
