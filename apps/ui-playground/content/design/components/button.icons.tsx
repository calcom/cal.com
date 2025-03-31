"use client";

import { RenderComponentWithSnippet } from "@/app/components/render";
import { Row } from "@/app/components/row";

import { Button } from "@calcom/ui/components/button";

const colors = ["primary", "secondary", "minimal", "destructive"] as const;

export const IconsExample: React.FC = () => (
  <RenderComponentWithSnippet>
    <div className="space-y-8">
      <div>
        <h3 className="text-default mb-4 text-sm">Start Icon</h3>
        <Row>
          {colors.map((color) => (
            <div key={color} className="flex flex-col items-center gap-2">
              <Button color={color} StartIcon="calendar">
                {color}
              </Button>
              <span className="text-subtle text-xs">Start Icon</span>
            </div>
          ))}
        </Row>
      </div>

      <div>
        <h3 className="text-default mb-4 text-sm">End Icon</h3>
        <Row>
          {colors.map((color) => (
            <div key={color} className="flex flex-col items-center gap-2">
              <Button color={color} EndIcon="arrow-right">
                {color}
              </Button>
              <span className="text-subtle text-xs">End Icon</span>
            </div>
          ))}
        </Row>
      </div>
    </div>
  </RenderComponentWithSnippet>
);
