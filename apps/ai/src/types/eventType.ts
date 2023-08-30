export type EventType = {
  id: number;
  title: string;
  length: number;
  metadata: object;
  slug: string;
  hosts: {
    userId: number;
    isFixed: boolean;
  }[];
  hidden: boolean;
  // ...
};
