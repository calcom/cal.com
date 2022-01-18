import { ChevronLeftIcon } from "@heroicons/react/solid";

import Shell from "@components/Shell";
import Button from "@components/ui/Button";

export default function Zoom() {
  return (
    <Shell
      heading="Zoom"
      subtitle="Zoom is the most popular video conferencing platform, joinable on the web or via desktop/mobile apps."
      large>
      <div className="mb-8">
        <Button color="secondary" href="/apps">
          <ChevronLeftIcon className="w-5 h-5" />
        </Button>
      </div>
      <div className="mb-16">
        <div className="grid grid-cols-3 gap-3"></div>
      </div>
    </Shell>
  );
}
