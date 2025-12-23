"use client";

import { useState } from "react";

import { DevProfiler, useRenderCount } from "@calcom/ui/components/dev-profiler";

function Counter() {
  useRenderCount("Counter");
  const [count, setCount] = useState(0);

  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-2 font-semibold">Counter Component</h3>
      <p className="mb-2">Count: {count}</p>
      <button
        onClick={() => setCount((c) => c + 1)}
        className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
        Increment
      </button>
    </div>
  );
}

function Timer() {
  useRenderCount("Timer");
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-2 font-semibold">Timer Component</h3>
      <p className="mb-2">Time: {time}</p>
      <button
        onClick={() => setTime(new Date().toLocaleTimeString())}
        className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600">
        Update Time
      </button>
    </div>
  );
}

function ParentComponent() {
  useRenderCount("ParentComponent");
  const [showChild, setShowChild] = useState(true);

  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-2 font-semibold">Parent Component</h3>
      <button
        onClick={() => setShowChild((s) => !s)}
        className="mb-4 rounded bg-purple-500 px-4 py-2 text-white hover:bg-purple-600">
        Toggle Child
      </button>
      {showChild && <ChildComponent />}
    </div>
  );
}

function ChildComponent() {
  useRenderCount("ChildComponent");

  return (
    <div className="mt-2 rounded bg-gray-100 p-3">
      <p>I am a child component</p>
    </div>
  );
}

export default function DevProfilerDemoPage() {
  useRenderCount("DevProfilerDemoPage");

  return (
    <DevProfiler>
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-2 text-3xl font-bold">DevProfiler Demo</h1>
          <p className="mb-8 text-gray-600">
            This page demonstrates the DevProfiler component. Click the badge in the bottom-right corner to
            see render statistics. Try clicking the buttons to trigger re-renders.
          </p>

          <div className="grid gap-6 md:grid-cols-2">
            <Counter />
            <Timer />
            <ParentComponent />
          </div>

          <div className="mt-8 rounded-lg bg-blue-50 p-4">
            <h2 className="mb-2 font-semibold">How to use:</h2>
            <ol className="list-inside list-decimal space-y-1 text-sm text-gray-700">
              <li>Look for the &quot;Renders: X&quot; badge in the bottom-right corner</li>
              <li>Click the badge to open the profiler panel</li>
              <li>Click the buttons above to trigger component re-renders</li>
              <li>Watch the render counts update in real-time</li>
            </ol>
          </div>
        </div>
      </div>
    </DevProfiler>
  );
}
