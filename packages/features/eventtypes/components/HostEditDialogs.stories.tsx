import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";

import type { FormValues } from "@calcom/features/eventtypes/lib/types";
import { DEFAULT_GROUP_ID } from "@calcom/lib/constants";

import type { CheckedSelectOption } from "./CheckedTeamSelect";
import { PriorityDialog, WeightDialog } from "./HostEditDialogs";

// Mock form data for the stories
const mockHosts = [
  {
    userId: 1,
    priority: 2,
    weight: 100,
    isFixed: false,
    groupId: DEFAULT_GROUP_ID,
  },
  {
    userId: 2,
    priority: 3,
    weight: 80,
    isFixed: false,
    groupId: DEFAULT_GROUP_ID,
  },
  {
    userId: 3,
    priority: 1,
    weight: 60,
    isFixed: false,
    groupId: DEFAULT_GROUP_ID,
  },
];

const mockOptions: CheckedSelectOption[] = [
  {
    avatar: "https://i.pravatar.cc/150?img=1",
    label: "John Doe",
    value: "1",
    priority: 2,
    weight: 100,
    isFixed: false,
    groupId: DEFAULT_GROUP_ID,
  },
  {
    avatar: "https://i.pravatar.cc/150?img=2",
    label: "Jane Smith",
    value: "2",
    priority: 3,
    weight: 80,
    isFixed: false,
    groupId: DEFAULT_GROUP_ID,
  },
  {
    avatar: "https://i.pravatar.cc/150?img=3",
    label: "Bob Johnson",
    value: "3",
    priority: 1,
    weight: 60,
    isFixed: false,
    groupId: DEFAULT_GROUP_ID,
  },
];

// Wrapper component to provide form context
const FormWrapper = ({ children }: { children: React.ReactNode }) => {
  const methods = useForm<FormValues>({
    defaultValues: {
      hosts: mockHosts,
      isRRWeightsEnabled: true,
      hostGroups: [],
    },
  });

  return <FormProvider {...methods}>{children}</FormProvider>;
};

// Priority Dialog Stories
const metaPriority = {
  component: PriorityDialog,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    isOpenDialog: {
      description: "Controls whether the dialog is open",
      control: "boolean",
    },
    option: {
      description: "The selected host option to edit",
      control: "object",
    },
    customClassNames: {
      description: "Custom CSS class names for styling",
      control: "object",
    },
  },
  decorators: [
    (Story) => (
      <FormWrapper>
        <Story />
      </FormWrapper>
    ),
  ],
} satisfies Meta<typeof PriorityDialog>;

export default metaPriority;
type PriorityStory = StoryObj<typeof metaPriority>;

export const PriorityDialogDefault: PriorityStory = {
  args: {
    isOpenDialog: true,
    option: mockOptions[0],
    options: mockOptions,
    onChange: (value) => console.log("Priority changed:", value),
    setIsOpenDialog: () => {},
  },
};

export const PriorityDialogHighPriority: PriorityStory = {
  args: {
    isOpenDialog: true,
    option: {
      ...mockOptions[1],
      priority: 3,
    },
    options: mockOptions,
    onChange: (value) => console.log("Priority changed:", value),
    setIsOpenDialog: () => {},
  },
};

export const PriorityDialogLowestPriority: PriorityStory = {
  args: {
    isOpenDialog: true,
    option: {
      ...mockOptions[2],
      priority: 0,
    },
    options: mockOptions,
    onChange: (value) => console.log("Priority changed:", value),
    setIsOpenDialog: () => {},
  },
};

export const PriorityDialogInteractive: PriorityStory = {
  render: (args) => {
    const [isOpen, setIsOpen] = useState(true);
    const [selectedOptions, setSelectedOptions] = useState(mockOptions);

    return (
      <FormWrapper>
        <div>
          <button
            onClick={() => setIsOpen(true)}
            className="mb-4 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
            Open Priority Dialog
          </button>
          <PriorityDialog
            {...args}
            isOpenDialog={isOpen}
            setIsOpenDialog={setIsOpen}
            option={mockOptions[0]}
            options={selectedOptions}
            onChange={(value) => {
              console.log("Priority changed:", value);
              setSelectedOptions(value as CheckedSelectOption[]);
            }}
          />
        </div>
      </FormWrapper>
    );
  },
};

// Weight Dialog Stories
const metaWeight = {
  component: WeightDialog,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    isOpenDialog: {
      description: "Controls whether the dialog is open",
      control: "boolean",
    },
    option: {
      description: "The selected host option to edit",
      control: "object",
    },
    customClassNames: {
      description: "Custom CSS class names for styling",
      control: "object",
    },
  },
  decorators: [
    (Story) => (
      <FormWrapper>
        <Story />
      </FormWrapper>
    ),
  ],
} satisfies Meta<typeof WeightDialog>;

export { metaWeight as WeightDialogMeta };
type WeightStory = StoryObj<typeof metaWeight>;

export const WeightDialogDefault: WeightStory = {
  args: {
    isOpenDialog: true,
    option: mockOptions[0],
    options: mockOptions,
    onChange: (value) => console.log("Weight changed:", value),
    setIsOpenDialog: () => {},
  },
};

export const WeightDialogHighWeight: WeightStory = {
  args: {
    isOpenDialog: true,
    option: {
      ...mockOptions[1],
      weight: 150,
    },
    options: mockOptions,
    onChange: (value) => console.log("Weight changed:", value),
    setIsOpenDialog: () => {},
  },
};

export const WeightDialogLowWeight: WeightStory = {
  args: {
    isOpenDialog: true,
    option: {
      ...mockOptions[2],
      weight: 50,
    },
    options: mockOptions,
    onChange: (value) => console.log("Weight changed:", value),
    setIsOpenDialog: () => {},
  },
};

export const WeightDialogInteractive: WeightStory = {
  render: (args) => {
    const [isOpen, setIsOpen] = useState(true);
    const [selectedOptions, setSelectedOptions] = useState(mockOptions);

    return (
      <FormWrapper>
        <div>
          <button
            onClick={() => setIsOpen(true)}
            className="mb-4 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
            Open Weight Dialog
          </button>
          <WeightDialog
            {...args}
            isOpenDialog={isOpen}
            setIsOpenDialog={setIsOpen}
            option={mockOptions[0]}
            options={selectedOptions}
            onChange={(value) => {
              console.log("Weight changed:", value);
              setSelectedOptions(value as CheckedSelectOption[]);
            }}
          />
        </div>
      </FormWrapper>
    );
  },
};

export const WeightDialogWithCustomClassNames: WeightStory = {
  args: {
    isOpenDialog: true,
    option: mockOptions[0],
    options: mockOptions,
    onChange: (value) => console.log("Weight changed:", value),
    setIsOpenDialog: () => {},
    customClassNames: {
      container: "bg-gray-50 p-4 rounded-lg",
      label: "text-blue-600 font-bold",
      confirmButton: "bg-green-600 hover:bg-green-700",
    },
  },
};

export const PriorityDialogWithCustomClassNames: PriorityStory = {
  args: {
    isOpenDialog: true,
    option: mockOptions[0],
    options: mockOptions,
    onChange: (value) => console.log("Priority changed:", value),
    setIsOpenDialog: () => {},
    customClassNames: {
      container: "bg-gray-50 p-4 rounded-lg",
      label: "text-blue-600 font-bold",
      confirmButton: "bg-green-600 hover:bg-green-700",
    },
  },
};

// Combined story showing both dialogs
export const AllDialogs: PriorityStory = {
  render: () => {
    const [priorityOpen, setPriorityOpen] = useState(false);
    const [weightOpen, setWeightOpen] = useState(false);
    const [selectedOptions, setSelectedOptions] = useState(mockOptions);

    return (
      <FormWrapper>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Host Edit Dialogs</h2>
          <div className="space-x-4">
            <button
              onClick={() => setPriorityOpen(true)}
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
              Edit Priority
            </button>
            <button
              onClick={() => setWeightOpen(true)}
              className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700">
              Edit Weight
            </button>
          </div>

          <div className="mt-4">
            <h3 className="mb-2 text-sm font-medium">Current Hosts:</h3>
            <ul className="space-y-2">
              {selectedOptions.map((opt) => (
                <li key={opt.value} className="rounded-md border p-2 text-sm">
                  <div className="font-medium">{opt.label}</div>
                  <div className="text-gray-600">
                    Priority: {opt.priority ?? 2} | Weight: {opt.weight ?? 100}%
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <PriorityDialog
            isOpenDialog={priorityOpen}
            setIsOpenDialog={setPriorityOpen}
            option={mockOptions[0]}
            options={selectedOptions}
            onChange={(value) => setSelectedOptions(value as CheckedSelectOption[])}
          />

          <WeightDialog
            isOpenDialog={weightOpen}
            setIsOpenDialog={setWeightOpen}
            option={mockOptions[0]}
            options={selectedOptions}
            onChange={(value) => setSelectedOptions(value as CheckedSelectOption[])}
          />
        </div>
      </FormWrapper>
    );
  },
  parameters: {
    layout: "padded",
  },
};
