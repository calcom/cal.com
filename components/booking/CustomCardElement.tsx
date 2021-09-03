import useDarkMode from "@lib/core/browser/useDarkMode";
import { CardElement, CardElementProps } from "@stripe/react-stripe-js";
import React, { FC } from "react";

const CARD_OPTIONS = {
  iconStyle: "solid" as const,
  classes: {
    base: "block p-2 w-full border-solid border-2 border-gray-300 rounded-md shadow-sm dark:bg-black dark:text-white dark:border-gray-900 focus-within:ring-black focus-within:border-black sm:text-sm",
  },
  style: {
    base: {
      fontSmoothing: "antialiased",
      color: "#000",
      iconColor: "#000",
      "::placeholder": {
        color: "#888888",
      },
    },
  },
};

const CustomCardElement: FC<CardElementProps> = (props) => {
  const { isDarkMode } = useDarkMode();

  if (isDarkMode) {
    CARD_OPTIONS.style.base.color = "#fff";
    CARD_OPTIONS.style.base.iconColor = "#fff";
    CARD_OPTIONS.style.base["::placeholder"].color = "#fff";
  }

  return <CardElement options={CARD_OPTIONS} {...props} />;
};

export default CustomCardElement;
