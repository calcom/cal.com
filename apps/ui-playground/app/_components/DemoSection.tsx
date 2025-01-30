"use client";

import { useState } from "react";

import { Badge } from "@calcom/ui";

interface DemoSectionProps {
  title: string;
  children: React.ReactNode;
  approvedByDesign?: boolean;
}

export default function DemoSection({ title, children, approvedByDesign }: DemoSectionProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="border-subtle bg-default rounded-lg border p-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-emphasis flex w-full items-center justify-between rounded-md py-2 text-lg font-semibold hover:text-gray-600">
        <span>
          {title}
          {approvedByDesign && <Badge className="ml-2">Approved by design</Badge>}
        </span>
        <span className="text-subtle">{isOpen ? "−" : "+"}</span>
      </button>

      {isOpen && <div className="space-y-8 pt-4">{children}</div>}
    </div>
  );
}

interface DemoSubSectionProps {
  id: string;
  title: string;
  children: React.ReactNode;
}

export function DemoSubSection({ id, title, children }: DemoSubSectionProps) {
  return (
    <section id={id}>
      <h2 className="text-emphasis mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}
