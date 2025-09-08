import { Profile } from "@calid/features/ui/Profile";

interface HeaderProps {
  heading: string | any;
  subtitle?: string | any;
}

export const Header = ({ heading, subtitle }: HeaderProps) => {
  // Defensive check to ensure heading and subtitle is defined
  if (!heading || !subtitle) {
    return null;
  }

  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full backdrop-blur">
      <div className="flex h-full w-full items-center justify-between">
        {/* Left section: Title and description */}
        <div className="flex flex-col justify-center space-y-1">
          <div className="flex items-center space-x-4">
            <div className="flex flex-col">
              <h1 className="text-default flex items-center text-xl font-semibold">{heading}</h1>
              <p className="text-subtle text-sm">{subtitle}</p>
            </div>
          </div>
        </div>

        {/* Right section: Profile */}
        <div className="ml-auto flex items-center space-x-2">
          {/* Profile Dropdown */}
          <Profile />
        </div>
      </div>
    </header>
  );
};
