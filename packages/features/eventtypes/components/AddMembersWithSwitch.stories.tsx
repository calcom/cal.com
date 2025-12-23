import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";

import type { FormValues, Host, TeamMember } from "@calcom/features/eventtypes/lib/types";

import { AddMembersWithSwitch } from "./AddMembersWithSwitch";

// Mock team members data
const mockTeamMembers: TeamMember[] = [
  {
    value: "1",
    label: "Alice Johnson",
    avatar: "https://i.pravatar.cc/150?img=1",
    email: "alice@example.com",
    defaultScheduleId: 1,
  },
  {
    value: "2",
    label: "Bob Smith",
    avatar: "https://i.pravatar.cc/150?img=2",
    email: "bob@example.com",
    defaultScheduleId: 2,
  },
  {
    value: "3",
    label: "Charlie Davis",
    avatar: "https://i.pravatar.cc/150?img=3",
    email: "charlie@example.com",
    defaultScheduleId: 3,
  },
  {
    value: "4",
    label: "Diana Prince",
    avatar: "https://i.pravatar.cc/150?img=4",
    email: "diana@example.com",
    defaultScheduleId: 4,
  },
  {
    value: "5",
    label: "Eve Martinez",
    avatar: "https://i.pravatar.cc/150?img=5",
    email: "eve@example.com",
    defaultScheduleId: 5,
  },
];

// Wrapper component to provide form context
const FormWrapper = ({ children, defaultValues }: { children: React.ReactNode; defaultValues?: any }) => {
  const methods = useForm<FormValues>({
    defaultValues: {
      assignRRMembersUsingSegment: defaultValues?.assignRRMembersUsingSegment || false,
      rrSegmentQueryValue: defaultValues?.rrSegmentQueryValue || null,
      ...defaultValues,
    },
  });

  return <FormProvider {...methods}>{children}</FormProvider>;
};

const meta = {
  component: AddMembersWithSwitch,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[600px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AddMembersWithSwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [hosts, setHosts] = useState<Host[]>([]);
    const [assignAllTeamMembers, setAssignAllTeamMembers] = useState(false);

    return (
      <FormWrapper>
        <AddMembersWithSwitch
          teamMembers={mockTeamMembers}
          value={hosts}
          onChange={setHosts}
          assignAllTeamMembers={assignAllTeamMembers}
          setAssignAllTeamMembers={setAssignAllTeamMembers}
          automaticAddAllEnabled={false}
          onActive={() => console.log("Active")}
          isFixed={false}
          placeholder="Add team members"
          teamId={1}
          groupId={null}
        />
      </FormWrapper>
    );
  },
};

export const WithSelectedMembers: Story = {
  render: () => {
    const [hosts, setHosts] = useState<Host[]>([
      {
        isFixed: false,
        userId: 1,
        priority: 2,
        weight: 100,
        scheduleId: 1,
        groupId: null,
      },
      {
        isFixed: false,
        userId: 2,
        priority: 2,
        weight: 100,
        scheduleId: 2,
        groupId: null,
      },
    ]);
    const [assignAllTeamMembers, setAssignAllTeamMembers] = useState(false);

    return (
      <FormWrapper>
        <AddMembersWithSwitch
          teamMembers={mockTeamMembers}
          value={hosts}
          onChange={setHosts}
          assignAllTeamMembers={assignAllTeamMembers}
          setAssignAllTeamMembers={setAssignAllTeamMembers}
          automaticAddAllEnabled={false}
          onActive={() => console.log("Active")}
          isFixed={false}
          placeholder="Add team members"
          teamId={1}
          groupId={null}
        />
      </FormWrapper>
    );
  },
};

export const WithAssignAllEnabled: Story = {
  render: () => {
    const [hosts, setHosts] = useState<Host[]>([]);
    const [assignAllTeamMembers, setAssignAllTeamMembers] = useState(false);

    return (
      <FormWrapper>
        <AddMembersWithSwitch
          teamMembers={mockTeamMembers}
          value={hosts}
          onChange={setHosts}
          assignAllTeamMembers={assignAllTeamMembers}
          setAssignAllTeamMembers={setAssignAllTeamMembers}
          automaticAddAllEnabled={true}
          onActive={() => console.log("Active")}
          isFixed={false}
          placeholder="Add team members"
          teamId={1}
          groupId={null}
        />
      </FormWrapper>
    );
  },
};

export const WithAssignAllActive: Story = {
  render: () => {
    const [hosts, setHosts] = useState<Host[]>([]);
    const [assignAllTeamMembers, setAssignAllTeamMembers] = useState(true);

    return (
      <FormWrapper>
        <AddMembersWithSwitch
          teamMembers={mockTeamMembers}
          value={hosts}
          onChange={setHosts}
          assignAllTeamMembers={assignAllTeamMembers}
          setAssignAllTeamMembers={setAssignAllTeamMembers}
          automaticAddAllEnabled={true}
          onActive={() => console.log("Active")}
          isFixed={false}
          placeholder="Add team members"
          teamId={1}
          groupId={null}
        />
      </FormWrapper>
    );
  },
};

export const WithSegmentApplicable: Story = {
  render: () => {
    const [hosts, setHosts] = useState<Host[]>([]);
    const [assignAllTeamMembers, setAssignAllTeamMembers] = useState(true);

    return (
      <FormWrapper>
        <AddMembersWithSwitch
          teamMembers={mockTeamMembers}
          value={hosts}
          onChange={setHosts}
          assignAllTeamMembers={assignAllTeamMembers}
          setAssignAllTeamMembers={setAssignAllTeamMembers}
          automaticAddAllEnabled={true}
          onActive={() => console.log("Active")}
          isFixed={false}
          placeholder="Add team members"
          teamId={1}
          isSegmentApplicable={true}
          groupId={null}
        />
      </FormWrapper>
    );
  },
};

export const WithRoundRobinWeights: Story = {
  render: () => {
    const [hosts, setHosts] = useState<Host[]>([
      {
        isFixed: false,
        userId: 1,
        priority: 2,
        weight: 80,
        scheduleId: 1,
        groupId: null,
      },
      {
        isFixed: false,
        userId: 2,
        priority: 1,
        weight: 120,
        scheduleId: 2,
        groupId: null,
      },
      {
        isFixed: false,
        userId: 3,
        priority: 2,
        weight: 100,
        scheduleId: 3,
        groupId: null,
      },
    ]);
    const [assignAllTeamMembers, setAssignAllTeamMembers] = useState(false);

    return (
      <FormWrapper>
        <AddMembersWithSwitch
          teamMembers={mockTeamMembers}
          value={hosts}
          onChange={setHosts}
          assignAllTeamMembers={assignAllTeamMembers}
          setAssignAllTeamMembers={setAssignAllTeamMembers}
          automaticAddAllEnabled={false}
          onActive={() => console.log("Active")}
          isFixed={false}
          placeholder="Add team members"
          isRRWeightsEnabled={true}
          teamId={1}
          groupId={null}
        />
      </FormWrapper>
    );
  },
};

export const FixedHosts: Story = {
  render: () => {
    const [hosts, setHosts] = useState<Host[]>([
      {
        isFixed: true,
        userId: 1,
        priority: 2,
        weight: 100,
        scheduleId: 1,
        groupId: null,
      },
      {
        isFixed: true,
        userId: 3,
        priority: 2,
        weight: 100,
        scheduleId: 3,
        groupId: null,
      },
    ]);
    const [assignAllTeamMembers, setAssignAllTeamMembers] = useState(false);

    return (
      <FormWrapper>
        <AddMembersWithSwitch
          teamMembers={mockTeamMembers}
          value={hosts}
          onChange={setHosts}
          assignAllTeamMembers={assignAllTeamMembers}
          setAssignAllTeamMembers={setAssignAllTeamMembers}
          automaticAddAllEnabled={false}
          onActive={() => console.log("Active")}
          isFixed={true}
          placeholder="Add fixed hosts"
          teamId={1}
          groupId={null}
        />
      </FormWrapper>
    );
  },
};

export const WithCustomClassNames: Story = {
  render: () => {
    const [hosts, setHosts] = useState<Host[]>([]);
    const [assignAllTeamMembers, setAssignAllTeamMembers] = useState(false);

    return (
      <FormWrapper>
        <AddMembersWithSwitch
          teamMembers={mockTeamMembers}
          value={hosts}
          onChange={setHosts}
          assignAllTeamMembers={assignAllTeamMembers}
          setAssignAllTeamMembers={setAssignAllTeamMembers}
          automaticAddAllEnabled={true}
          onActive={() => console.log("Active")}
          isFixed={false}
          placeholder="Add team members"
          teamId={1}
          groupId={null}
          customClassNames={{
            assingAllTeamMembers: {
              container: "border-2 border-blue-200 p-4 rounded-lg",
            },
          }}
        />
      </FormWrapper>
    );
  },
};

export const WithGroupId: Story = {
  render: () => {
    const [hosts, setHosts] = useState<Host[]>([
      {
        isFixed: false,
        userId: 1,
        priority: 2,
        weight: 100,
        scheduleId: 1,
        groupId: "group-123",
      },
    ]);
    const [assignAllTeamMembers, setAssignAllTeamMembers] = useState(false);

    return (
      <FormWrapper>
        <AddMembersWithSwitch
          teamMembers={mockTeamMembers}
          value={hosts}
          onChange={setHosts}
          assignAllTeamMembers={assignAllTeamMembers}
          setAssignAllTeamMembers={setAssignAllTeamMembers}
          automaticAddAllEnabled={true}
          onActive={() => console.log("Active")}
          isFixed={false}
          placeholder="Add team members"
          teamId={1}
          groupId="group-123"
        />
      </FormWrapper>
    );
  },
};

export const Interactive: Story = {
  render: () => {
    const [hosts, setHosts] = useState<Host[]>([]);
    const [assignAllTeamMembers, setAssignAllTeamMembers] = useState(false);

    return (
      <FormWrapper>
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h3 className="mb-2 text-sm font-semibold">State:</h3>
            <div className="space-y-1 text-xs">
              <p>Assign all: {assignAllTeamMembers ? "Yes" : "No"}</p>
              <p>Selected hosts: {hosts.length}</p>
              {hosts.length > 0 && (
                <div className="mt-2">
                  <p className="font-medium">Host details:</p>
                  {hosts.map((host) => {
                    const member = mockTeamMembers.find((m) => m.value === host.userId.toString());
                    return (
                      <div key={host.userId} className="ml-2">
                        {member?.label} (Priority: {host.priority}, Weight: {host.weight})
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <AddMembersWithSwitch
            teamMembers={mockTeamMembers}
            value={hosts}
            onChange={(newHosts) => {
              console.log("Hosts changed:", newHosts);
              setHosts(newHosts);
            }}
            assignAllTeamMembers={assignAllTeamMembers}
            setAssignAllTeamMembers={(value) => {
              console.log("Assign all changed:", value);
              setAssignAllTeamMembers(value);
            }}
            automaticAddAllEnabled={true}
            onActive={() => console.log("Activated")}
            isFixed={false}
            placeholder="Select team members"
            isRRWeightsEnabled={true}
            teamId={1}
            groupId={null}
          />
        </div>
      </FormWrapper>
    );
  },
};
