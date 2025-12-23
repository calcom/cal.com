import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { Slider } from "./Common";

const meta = {
  component: Slider,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[400px] p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState(50);
    return (
      <div className="space-y-4">
        <Slider value={value} label="Default Slider" changeHandler={setValue} min={0} max={100} step={1} />
        <p className="text-subtle text-sm">Value: {value}</p>
      </div>
    );
  },
};

export const ZoomControl: Story = {
  render: () => {
    const [zoom, setZoom] = useState(1);
    return (
      <div className="space-y-4">
        <label className="text-emphasis text-sm font-medium">Zoom Level</label>
        <Slider
          value={zoom}
          label="Zoom Control"
          changeHandler={setZoom}
          min={0.1}
          max={3}
          step={0.1}
        />
        <p className="text-subtle text-sm">Zoom: {zoom.toFixed(1)}x</p>
      </div>
    );
  },
};

export const BrightnessControl: Story = {
  render: () => {
    const [brightness, setBrightness] = useState(100);
    return (
      <div className="space-y-4">
        <label className="text-emphasis text-sm font-medium">Brightness</label>
        <Slider
          value={brightness}
          label="Brightness Control"
          changeHandler={setBrightness}
          min={0}
          max={200}
          step={1}
        />
        <p className="text-subtle text-sm">{brightness}%</p>
      </div>
    );
  },
};

export const RotationControl: Story = {
  render: () => {
    const [rotation, setRotation] = useState(0);
    return (
      <div className="space-y-4">
        <label className="text-emphasis text-sm font-medium">Rotation</label>
        <Slider
          value={rotation}
          label="Rotation Control"
          changeHandler={setRotation}
          min={0}
          max={360}
          step={1}
        />
        <p className="text-subtle text-sm">{rotation}°</p>
      </div>
    );
  },
};

export const OpacityControl: Story = {
  render: () => {
    const [opacity, setOpacity] = useState(100);
    return (
      <div className="space-y-4">
        <label className="text-emphasis text-sm font-medium">Opacity</label>
        <Slider
          value={opacity}
          label="Opacity Control"
          changeHandler={setOpacity}
          min={0}
          max={100}
          step={1}
        />
        <div className="flex items-center gap-4">
          <div
            className="bg-default h-16 w-16 rounded border"
            style={{ opacity: opacity / 100 }}
          />
          <p className="text-subtle text-sm">{opacity}%</p>
        </div>
      </div>
    );
  },
};

export const ImageCropScale: Story = {
  render: () => {
    const [scale, setScale] = useState(1);
    return (
      <div className="space-y-4">
        <label className="text-emphasis text-sm font-medium">Image Scale</label>
        <p className="text-subtle text-xs">Scale image for cropping</p>
        <Slider
          value={scale}
          label="Image Crop Scale"
          changeHandler={setScale}
          min={1}
          max={3}
          step={0.05}
        />
        <p className="text-subtle text-sm">Scale: {scale.toFixed(2)}x</p>
      </div>
    );
  },
};

export const VolumeControl: Story = {
  render: () => {
    const [volume, setVolume] = useState(75);
    return (
      <div className="space-y-4">
        <label className="text-emphasis text-sm font-medium">Volume</label>
        <Slider
          value={volume}
          label="Volume Control"
          changeHandler={setVolume}
          min={0}
          max={100}
          step={5}
        />
        <div className="flex items-center gap-2">
          <div className="bg-emphasis h-2 rounded" style={{ width: `${volume}%` }} />
          <p className="text-subtle text-sm">{volume}%</p>
        </div>
      </div>
    );
  },
};

export const Disabled: Story = {
  render: () => {
    const [value, setValue] = useState(50);
    return (
      <div className="space-y-4">
        <label className="text-emphasis text-sm font-medium">Disabled Slider</label>
        <Slider
          value={value}
          label="Disabled Slider"
          changeHandler={setValue}
          min={0}
          max={100}
          step={1}
          disabled
        />
        <p className="text-subtle text-sm">Value: {value}</p>
      </div>
    );
  },
};
