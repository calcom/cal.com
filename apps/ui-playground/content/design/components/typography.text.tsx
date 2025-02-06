"use client";

import { RenderComponentWithSnippet } from "@/app/components/render";

export const TextExample: React.FC = () => (
  <RenderComponentWithSnippet>
    <div className="space-y-4">
      <div>
        <h3 className="text-emphasis mb-2 text-sm font-medium">Regular Text</h3>
        <p className="text-default text-base">
          This is a regular paragraph with base size. It can contain multiple lines of text and will maintain
          consistent spacing.
        </p>
      </div>

      <div>
        <h3 className="text-emphasis mb-2 text-sm font-medium">Text Sizes</h3>
        <div className="space-y-2">
          <p className="text-default text-xs">Extra Small Text (text-xs)</p>
          <p className="text-default text-sm">Small Text (text-sm)</p>
          <p className="text-default text-base">Base Text (text-base)</p>
          <p className="text-default text-lg">Large Text (text-lg)</p>
          <p className="text-default text-xl">Extra Large Text (text-xl)</p>
        </div>
      </div>

      <div>
        <h3 className="text-emphasis mb-2 text-sm font-medium">Font Weights</h3>
        <div className="space-y-2">
          <p className="text-default text-base font-light">Light Text</p>
          <p className="text-default text-base font-normal">Normal Text</p>
          <p className="text-default text-base font-medium">Medium Text</p>
          <p className="text-default text-base font-semibold">Semibold Text</p>
          <p className="text-default text-base font-bold">Bold Text</p>
        </div>
      </div>

      <div>
        <h3 className="text-emphasis mb-2 text-sm font-medium">Decorative Styles</h3>
        <div className="space-y-2">
          <p className="text-default text-base italic">Italic Text</p>
          <p className="text-default text-base underline">Underlined Text</p>
          <p className="text-default text-base line-through">Strikethrough Text</p>
        </div>
      </div>
    </div>
  </RenderComponentWithSnippet>
);
