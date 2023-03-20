export default function SettingInputContainer({
  Input,
  Icon,
  label,
  htmlFor,
}: {
  Input: React.ReactNode;
  Icon: (props: React.SVGProps<SVGSVGElement>) => JSX.Element | null;
  label: string;
  htmlFor?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="block sm:flex">
        <div className="min-w-48 mb-4 sm:mb-0">
          <label htmlFor={htmlFor} className="mt-1 flex text-sm font-medium text-gray-700">
            <Icon className="mt-0.5 h-4 w-4 text-gray-500 ltr:mr-2 rtl:ml-2" />
            {label}
          </label>
        </div>
        <div className="w-full flex-grow">{Input}</div>
      </div>
    </div>
  );
}
