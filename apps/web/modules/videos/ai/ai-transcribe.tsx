import { useDaily } from "@daily-co/daily-react";

export const CalAiTransctibe = () => {
  const daily = useDaily();

  return (
    <div id="cal-ai-thing" className="max-h-full overflow-x-hidden overflow-y-scroll p-2">
      <h3>Transcript</h3>
    </div>
  );
};
