import { useRouter } from "next/router";
import { FormattedTime } from "react-intl";

import { asStringOrUndefined } from "@lib/asStringOrNull";

const Clock = ({ value }: { value: Date }) => {
  const router = useRouter();
  const hour12 = asStringOrUndefined(router.query.hour12);
  return (
    <span className="lowercase">
      <FormattedTime value={value} hourCycle={hour12 === "1" ? "h12" : "h23"} timeStyle="short" />
    </span>
  );
};

export default Clock;
