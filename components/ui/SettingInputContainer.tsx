export default function SettingInputContainer({
  Input,
  Icon,
  label,
  htmlFor,
}: {
  Input: React.ReactNode;
  Icon: (props: React.SVGProps<SVGSVGElement>) => JSX.Element;
  label: string;
  htmlFor?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="block sm:flex">
        <div className="mb-4 min-w-48 sm:mb-0">
          <label htmlFor={htmlFor} className="flex mt-1 text-sm font-medium text-neutral-700">
            <Icon className="w-4 h-4 mr-2 mt-0.5 text-neutral-500" />
            {label}
          </label>
        </div>
        <div className="flex-grow w-full">{Input}</div>
      </div>
    </div>
  );
}
