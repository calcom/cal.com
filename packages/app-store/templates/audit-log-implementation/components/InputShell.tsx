import { Button } from "@calcom/ui";

export const InputShell = ({ isDirty, children }: { isDirty: boolean; children: React.ReactNode }) => {
  return (
    <>
      {children}
      <Button data-dirty={isDirty} className="mb-1 data-[dirty=false]:hidden" type="submit">
        Submit
      </Button>
    </>
  );
};
