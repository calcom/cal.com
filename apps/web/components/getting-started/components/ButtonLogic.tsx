import { showToast } from "@calcom/ui";

export const onButtonClick = async (nextStep: () => void, setButtonDisabled: (disabled: boolean) => void) => {
  setButtonDisabled(true);

  try {
    await nextStep();
  } catch (e) {
    showToast("An error occurred", "error");
    setTimeout(() => {
      setButtonDisabled(false);
    }, 2000);
  }
};
