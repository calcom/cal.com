import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Label } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { Popover, PopoverContent, PopoverTrigger } from "@calcom/ui/popover";

interface GenerateAboutButtonProps {
  onGenerated: (text: string) => void;
}

const GenerateAboutButton = ({ onGenerated }: GenerateAboutButtonProps) => {
  const { t } = useLocale();
  const [prompt, setPrompt] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // tRPC mutation for LLM call
  const llmMutation = trpc.viewer.me.llm.useMutation({
    onSuccess: (data) => {
      console.log("LLM Response:", data);
      showToast("Bio generated successfully!", "success");
      onGenerated(data.response);
      setIsOpen(false);
      setPrompt("");
    },
    onError: (error) => {
      console.error("Error calling LLM API:", error);
      showToast("Failed to generate bio. Please try again.", "error");
    },
  });

  const handleSubmit = () => {
    if (!prompt.trim()) {
      showToast("Please enter some information about yourself", "error");
      return;
    }

    llmMutation.mutate({
      prompt,
    });
  };

  const handleCancel = () => {
    setPrompt("");
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2" size="sm">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          Generate Bio
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-96 p-6" align="start">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prompt-text" className="text-sm font-medium">
              Tell us about yourself
            </Label>
            <textarea
              id="prompt-text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., I'm a software engineer with 5 years of experience in React and Node.js. I love building user-friendly applications..."
              className="min-h-32 w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              rows={4}
            />
            <p className="text-xs text-gray-500">
              Describe your background, skills, interests, or what makes you unique. The AI will generate a
              professional bio for you.
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleSubmit}
              className="flex-1"
              disabled={!prompt.trim()}
              loading={llmMutation.isPending}>
              Generate Bio
            </Button>
            <Button variant="outline" onClick={handleCancel} className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default GenerateAboutButton;
