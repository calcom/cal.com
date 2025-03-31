"use client";

import { RenderComponentWithSnippet } from "@/app/components/render";
import { useState } from "react";

import { Switch } from "@calcom/ui/components/form";

export const BasicExample = () => {
  const [checked, setChecked] = useState(false);

  return (
    <RenderComponentWithSnippet>
      <div className="flex flex-col space-y-4">
        <Switch label="Basic switch with label" checked={checked} onCheckedChange={setChecked} />
      </div>
    </RenderComponentWithSnippet>
  );
};

export const LabelPositionExample = () => {
  const [checked, setChecked] = useState(false);
  return (
    <RenderComponentWithSnippet>
      <div className="flex flex-col space-y-4">
        <Switch label="Label on trailing side (default)" checked={checked} onCheckedChange={setChecked} />
        <Switch label="Label on leading side" labelOnLeading checked={checked} onCheckedChange={setChecked} />
      </div>
    </RenderComponentWithSnippet>
  );
};

export const StatesExample = () => {
  return (
    <RenderComponentWithSnippet>
      <div className="flex flex-col space-y-4">
        <Switch label="Enabled switch" checked />
        <Switch label="Disabled switch" disabled />
        <Switch label="Disabled and checked switch" disabled defaultChecked />
      </div>
    </RenderComponentWithSnippet>
  );
};

export const ControlledExample = () => {
  const [checked, setChecked] = useState(false);

  return (
    <RenderComponentWithSnippet>
      <div className="flex flex-col space-y-4">
        <Switch
          label={`Switch is ${checked ? "on" : "off"}`}
          checked={checked}
          onCheckedChange={setChecked}
        />
      </div>
    </RenderComponentWithSnippet>
  );
};

export const WithPadding = () => {
  const [checked, setChecked] = useState(false);
  return (
    <RenderComponentWithSnippet>
      <div className="flex flex-col space-y-4">
        <Switch
          label={`Switch is ${checked ? "on" : "off"}`}
          checked={checked}
          onCheckedChange={setChecked}
          padding
        />
      </div>
    </RenderComponentWithSnippet>
  );
};

export const SwitchSizes = () => {
  const [checked, setChecked] = useState(false);

  return (
    <RenderComponentWithSnippet>
      <div className="flex flex-col space-y-4">
        <Switch label="Small switch" size="sm" checked={checked} onCheckedChange={setChecked} />
        <Switch label="Medium switch" checked={checked} onCheckedChange={setChecked} />
      </div>
    </RenderComponentWithSnippet>
  );
};
