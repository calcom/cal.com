import { ShieldCheckIcon } from "@calcom/ui/components/icon";

const TwoFactorModalHeader = ({ title, description }: { title: string; description: string }) => {
  return (
    <div className="mb-4 sm:flex sm:items-start">
      <div className="bg-brand text-brandcontrast dark:bg-darkmodebrand dark:text-darkmodebrandcontrast mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-opacity-5 sm:mx-0 sm:h-10 sm:w-10">
        <ShieldCheckIcon className="h-6 w-6 text-white" />
      </div>
      <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
        <h3 className="font-cal text-lg font-medium leading-6 text-gray-900" id="modal-title">
          {title}
        </h3>
        <p className="text-sm text-gray-400">{description}</p>
      </div>
    </div>
  );
};

export default TwoFactorModalHeader;
