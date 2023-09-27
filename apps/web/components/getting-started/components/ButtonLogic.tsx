import { useState } from "react";

import { showToast } from "@calcom/ui";

export function OnNextStepLogic() {
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);

  const handleClick = async (callback: () => void) => {
    setIsButtonDisabled(true);
    try {
      await callback();
    } catch (e) {
      showToast("An error occurred", "error");
      setTimeout(() => {
        //This will re-enable the button after 3 secs of catching error
        setIsButtonDisabled(false);
      }, 3000);
    }
  };

  return {
    isButtonDisabled,
    handleClick,
  };
}
