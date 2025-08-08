"use client";

import React from "react";

export const WorkflowLoading: React.FC = () => {
  return (
    <div className="bg-background min-h-screen">
      <div className="px-8 py-6">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-muted h-24 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
};
