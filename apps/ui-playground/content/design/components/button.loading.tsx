"use client";

import { RenderComponentWithSnippet } from "@/app/components/render";
import { Row } from "@/app/components/row";

import { Button } from "@calcom/ui/components/button";

const colors = ["primary", "secondary", "minimal", "destructive"] as const;

export const LoadingExample: React.FC = () => {
  return (
    <RenderComponentWithSnippet>
      <div className="space-y-8">
        <div>
          <h3 className="text-default mb-4 text-sm">Loading State</h3>
          <Row>
            {colors.map((color) => (
              <div key={color} className="flex flex-col items-center gap-2">
                <Button color={color} loading>
                  {color}
                </Button>
                <span className="text-subtle text-xs">Loading</span>
              </div>
            ))}
          </Row>
        </div>

        <div>
          <h3 className="text-default mb-4 text-sm">Loading with Icons</h3>
          <Row>
            {colors.map((color) => (
              <div key={color} className="flex flex-col items-center gap-2">
                <Button color={color} loading StartIcon="calendar">
                  {color}
                </Button>
                <span className="text-subtle text-xs">With Icon</span>
              </div>
            ))}
          </Row>
        </div>
      </div>
    </RenderComponentWithSnippet>
  );
};
