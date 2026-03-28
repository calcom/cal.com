export const useLocale = () => ({
  t: (key: string, options?: Record<string, string>) => {
    const map: Record<string, string> = {
      verify_your_email: "Verify your email",
      code: "Code",
      submit: "Submit",
    };
    if (key === "enter_digit_code" && options?.email) {
      return `We sent a code to ${options.email}`;
    }
    return map[key] ?? key;
  },
  i18n: {},
  isLocaleReady: true,
});
