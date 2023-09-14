import { Shield } from "@calcom/ui/components/icon";

const TwoFactorModalHeader = ({ title, description }: { title: string; description: string }) => {
  return (
    <div className="mb-4 sm:flex sm:items-start">
      <div className="bg-brand text-brandcontrast dark:bg-darkmodebrand dark:text-darkmodebrandcontrast mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-opacity-5 sm:mx-0 sm:h-10 sm:w-10">
        <Shield className="text-inverted h-6 w-6" />
      </div>
      <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
        <h3 className="font-cal text-emphasis text-lg font-medium leading-6" id="modal-title">
          {title}
        </h3>
        <p className="text-muted text-sm">{description}</p>
      </div>
    </div>
  );
};

export default TwoFactorModalHeader;
