"use client";

import { Button } from "@calcom/ui/components/button";
import { RenderComponentWithSnippet } from "@/app/components/render";
import { Row } from "@/app/components/row";

export const OnClickExample: React.FC = () => (
  <RenderComponentWithSnippet>
    <Row>
      <Button onClick={() => alert("hello")}>Trigger Alert</Button>
    </Row>
  </RenderComponentWithSnippet>
);
