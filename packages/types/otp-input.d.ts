import { OtpInputProps as Props } from "react-otp-input";

// necessary to extend OtpInputProps and accept autocomplete="code"
declare module "react-otp-input" {
  interface OtpInputProps extends Props {
    autocomplete?: string;
  }
}
