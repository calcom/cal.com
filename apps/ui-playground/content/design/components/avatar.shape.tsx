import { Avatar } from "@calcom/ui/components/avatar";

export function ShapeExample() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Avatar
          alt="Circle Avatar"
          title="Circle Avatar"
          size="lg"
          shape="circle"
          imageSrc="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
        />
        <Avatar
          alt="Square Avatar"
          title="Square Avatar"
          size="lg"
          shape="square"
          imageSrc="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
        />
      </div>
    </div>
  );
}
