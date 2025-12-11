// Dedicated type definition for routing form data
export type RoutingForm = {
  id: string;
  description: string | null;
  position: number;
  routes: any; // JSON field
  createdAt: Date;
  updatedAt: Date;
  name: string;
  fields: any; // JSON field
  updatedById: number | null;
  userId: number | null;
  teamId: number | null;
  disabled: boolean;
  settings: any; // JSON field
};

// Helper type for select parameter
export type RoutingFormSelect = {
  [K in keyof RoutingForm]?: boolean;
};

// Helper type for selected fields
export type SelectedFields<T> = T extends undefined
  ? RoutingForm
  : {
      [K in keyof T as T[K] extends true ? K : never]: K extends keyof RoutingForm ? RoutingForm[K] : never;
    };

// Type for findById options
export type FindByIdOptions<T extends RoutingFormSelect | undefined = undefined> = {
  select?: T;
};

// Type for findFormByIdIncludeUserTeamAndOrg result
export type RoutingFormWithUserTeamAndOrg = {
  id: string;
  description: string | null;
  position: number;
  routes: any;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  fields: any;
  updatedById: number | null;
  userId: number;
  teamId: number | null;
  disabled: boolean;
  settings: any;
  user: {
    id: number;
    metadata: any;
    organization: {
      slug: string | null;
    } | null;
    username: string | null;
    email: string;
    movedToProfileId: number | null;
    timeFormat: number | null;
    locale: string | null;
  };
  team: {
    metadata: any;
    slug: string | null;
    parentId: number | null;
    parent: {
      slug: string | null;
    } | null;
  } | null;
};

// Interface for static methods (for documentation and type checking purposes)
export interface IPrismaRoutingFormRepositoryStatic {
  findById<T extends RoutingFormSelect | undefined = undefined>(
    id: string,
    options?: FindByIdOptions<T>
  ): Promise<SelectedFields<T> | null>;

  findFormByIdIncludeUserTeamAndOrg(formId: string): Promise<RoutingFormWithUserTeamAndOrg | null>;
}
