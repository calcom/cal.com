/**
 * Pipedrive API v2 Client
 * Clean API abstraction layer - only handles HTTP requests to Pipedrive API v2
 */
export class PipedriveApiClient {
  private apiUrl: string;
  private getAccessToken: () => Promise<string>;

  constructor(apiUrl: string, getAccessToken: () => Promise<string>) {
    this.apiUrl = apiUrl;
    this.getAccessToken = getAccessToken;
  }

  /**
   * Make authenticated request to Pipedrive API v2
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const accessToken = await this.getAccessToken();
    const url = `${this.apiUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Pipedrive API error [${response.status}]: ${errorText}`);
    }

    return response.json();
  }

  // ============================================
  // PERSONS API (v2)
  // ============================================

  async searchPersons(email: string): Promise<PipedrivePersonSearchResponse> {
    return this.request<PipedrivePersonSearchResponse>(
      `/persons/search?term=${encodeURIComponent(email)}&fields=email&exact_match=true`
    );
  }

  async createPerson(data: CreatePersonPayload): Promise<PipedrivePersonResponse> {
    return this.request<PipedrivePersonResponse>("/persons", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // ============================================
  // ACTIVITIES API (v2)
  // ============================================

  async createActivity(data: CreateActivityPayload): Promise<PipedriveActivityResponse> {
    return this.request<PipedriveActivityResponse>("/activities", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateActivity(id: string, data: UpdateActivityPayload): Promise<PipedriveActivityResponse> {
    return this.request<PipedriveActivityResponse>(`/activities/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteActivity(id: string): Promise<void> {
    await this.request<{ success: boolean }>(`/activities/${id}`, {
      method: "DELETE",
    });
  }
}

// ============================================
// TYPE DEFINITIONS (v2 API)
// ============================================

export interface PipedrivePersonSearchResponse {
  success: boolean;
  data?: {
    items: Array<{
      item: {
        id: number;
        name: string;
        emails: string[];
        first_name: string;
        last_name: string;
      };
    }>;
  };
}

export interface PipedrivePersonResponse {
  success: boolean;
  data?: {
    id: number;
    name: string;
    emails: Array<{ value: string; primary: boolean; label: string }>;
    first_name: string;
    last_name: string;
  };
}

export interface CreatePersonPayload {
  name?: string;
  first_name?: string;
  last_name?: string;
  emails?: Array<{ value: string; label?: string; primary?: boolean }>;
  phones?: Array<{ value: string; label?: string; primary?: boolean }>;
}

export interface PipedriveActivityResponse {
  success: boolean;
  data?: {
    id: number;
    subject: string;
    due_date: string;
    due_time: string;
    duration: string;
    note: string;
    location: {
      value: string;
      formatted_address?: string;
      route?: string;
      street_number?: string;
      sublocality?: string;
      locality?: string;
      admin_area_level_1?: string;
      admin_area_level_2?: string;
      country?: string;
      postal_code?: string;
    } | null;
    person_id: number | null;
    deal_id: number | null;
    org_id: number | null;
    type: string;
    busy: boolean;
  };
}

export interface CreateActivityPayload {
  subject: string;
  due_date: string;
  due_time: string;
  duration: string;
  note: string;
  location: string[];
  participants: {
    person_id: number;
    primary: boolean;
  }[];
  deal_id?: number;
  org_id?: number;
  type?: string;
  busy?: boolean;
}

export interface UpdateActivityPayload {
  subject?: string;
  due_date?: string;
  due_time?: string;
  duration?: string;
  note?: string;
  location?: string | null;
}
