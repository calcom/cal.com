type EventTypeProp = {
  id?: string;
};

export function EventType({ id }: EventTypeProp) {
  return (
    <div className="hover:bg-muted flex w-full items-center justify-between transition">
      <div className="group flex w-full max-w-full items-center justify-between overflow-hidden px-4 py-4 sm:px-6">
        {}
      </div>
      <div>{}</div>
    </div>
  );
}
