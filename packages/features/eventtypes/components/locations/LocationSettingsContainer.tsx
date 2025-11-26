const LocationSettingsContainer = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="bg-cal-muted mt-2 stack-y-2 rounded-lg p-4">
      <div className="w-full">
        <div className="flex flex-col gap-4">{children}</div>
      </div>
    </div>
  );
};

export default LocationSettingsContainer;
