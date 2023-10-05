const TimelineBlock = ({ trail, children }) => {
  return (
    <div className="relative flex gap-x-4">
      {trail && (
        <div className="absolute -bottom-6 left-0 top-0 flex w-6 justify-center">
          <div className="w-px bg-gray-200" />
        </div>
      )}
      <div className="relative flex h-6 w-6 flex-none items-center justify-center bg-white">
        <div className="h-1.5 w-1.5 rounded-full bg-gray-300 ring-1 ring-gray-400" />
      </div>
      <div className="w-full space-y-3">{children}</div>
    </div>
  );
};

export default TimelineBlock;
