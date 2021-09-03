import { CardElement, CardElementProps } from "@stripe/react-stripe-js";
import React, { FC } from "react";

const CARD_OPTIONS = {
  iconStyle: "solid" as const,
  classes: {
    base: "block p-2 w-full border-solid border-2 border-gray-300 rounded-md shadow-sm dark:bg-black dark:text-white dark:border-gray-900 focus-within:ring-black focus-within:border-black sm:text-sm",
  },
};

const CustomCardElement: FC<CardElementProps> = (props) => {
  return <CardElement options={CARD_OPTIONS} {...props} />;
};

export default CustomCardElement;
