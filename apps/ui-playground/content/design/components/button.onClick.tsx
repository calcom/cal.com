"use client";

import { RenderComponentWithSnippet } from "@/app/components/render";
import { Row } from "@/app/components/row";

import { Button } from "@calcom/ui/components/button";

export const OnClickExample: React.FC = () => (
  <RenderComponentWithSnippet>
    <Row>
      <Button onClick={() => alert("hello")}>Trigger Alert</Button>
    </Row>
  </RenderComponentWithSnippet>
);
