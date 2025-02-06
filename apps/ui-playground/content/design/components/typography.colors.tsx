"use client";

import { RenderComponentWithSnippet } from "@/app/components/render";

export const ColorsExample: React.FC = () => (
  <RenderComponentWithSnippet>
    <div className="space-y-4">
      <div>
        <h3 className="text-emphasis mb-2 text-sm font-medium">Text Colors</h3>
        <div className="space-y-2">
          <p className="text-emphasis text-base">Emphasis Text</p>
          <p className="text-default text-base">Default Text</p>
          <p className="text-subtle text-base">Subtle Text</p>
          <p className="text-muted text-base">Muted Text</p>
          <p className="text-inverted text-base">Inverted Text</p>
        </div>
      </div>

      <div>
        <h3 className="text-emphasis mb-2 text-sm font-medium">Semantic Colors</h3>
        <div className="space-y-2">
          <p className="text-base text-gray-900">Primary Text</p>
          <p className="text-base text-blue-600">Info Text</p>
          <p className="text-base text-green-600">Success Text</p>
          <p className="text-base text-yellow-600">Warning Text</p>
          <p className="text-base text-red-600">Error Text</p>
        </div>
      </div>

      <div>
        <h3 className="text-emphasis mb-2 text-sm font-medium">Links</h3>
        <div className="space-y-2">
          <a href="#" className="text-base text-blue-600 hover:text-blue-700">
            Default Link
          </a>
          <br />
          <a href="#" className="text-base text-gray-600 hover:text-gray-900">
            Subtle Link
          </a>
          <br />
          <a href="#" className="text-base text-red-600 hover:text-red-700">
            Destructive Link
          </a>
        </div>
      </div>
    </div>
  </RenderComponentWithSnippet>
);
