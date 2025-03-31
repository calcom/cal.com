"use client";

import { RenderComponentWithSnippet } from "@/app/components/render";
import { Row } from "@/app/components/row";

import { Button } from "@calcom/ui/components/button";

const colors = ["primary", "secondary", "minimal", "destructive"] as const;

export const DisabledExample: React.FC = () => (
  <RenderComponentWithSnippet>
    <div className="space-y-8">
      <div>
        <h3 className="text-default mb-4 text-sm">Disabled State</h3>
        <Row>
          {colors.map((color) => (
            <div key={color} className="flex flex-col items-center gap-2">
              <Button color={color} disabled>
                {color}
              </Button>
              <span className="text-subtle text-xs">Disabled</span>
            </div>
          ))}
        </Row>
      </div>

      <div>
        <h3 className="text-default mb-4 text-sm">Disabled with Icons</h3>
        <Row>
          {colors.map((color) => (
            <div key={color} className="flex flex-col items-center gap-2">
              <Button color={color} disabled StartIcon="calendar">
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
