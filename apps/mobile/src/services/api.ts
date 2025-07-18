import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const API_BASE_URL = "http://localhost:5555/v2";

class ApiService {
  private apiKey: string | null = null;

  async setApiKey(key: string) {
    const formattedKey = key.startsWith("cal_") ? key : `cal_${key}`;
    this.apiKey = formattedKey;
    await AsyncStorage.setItem("cal_api_key", formattedKey);
  }

  async getApiKey(): Promise<string | null> {
    if (!this.apiKey) {
      this.apiKey = await AsyncStorage.getItem("cal_api_key");
    }
    return this.apiKey;
  }

  async clearApiKey() {
    this.apiKey = null;
    await AsyncStorage.removeItem("cal_api_key");
  }

  private async getHeaders() {
    const apiKey = await this.getApiKey();
    return {
      "Content-Type": "application/json",
      "cal-api-version": "2024-06-14",
      Authorization: `Bearer ${apiKey}`,
    };
  }

  async getEventTypes() {
    const headers = await this.getHeaders();
    const response = await axios.get(`${API_BASE_URL}/event-types`, { headers });
    return response.data;
  }

  async getEventType(id: string) {
    const headers = await this.getHeaders();
    const response = await axios.get(`${API_BASE_URL}/event-types/${id}`, { headers });
    return response.data;
  }

  async createEventType(data: any) {
    const headers = await this.getHeaders();
    const response = await axios.post(`${API_BASE_URL}/event-types`, data, { headers });
    return response.data;
  }

  async updateEventType(id: string, data: any) {
    const headers = await this.getHeaders();
    const response = await axios.patch(`${API_BASE_URL}/event-types/${id}`, data, { headers });
    return response.data;
  }

  async deleteEventType(id: string) {
    const headers = await this.getHeaders();
    const response = await axios.delete(`${API_BASE_URL}/event-types/${id}`, { headers });
    return response.data;
  }

  async getAvailableSlots(params: any) {
    const headers = await this.getHeaders();
    const response = await axios.get(`${API_BASE_URL}/slots`, {
      headers,
      params,
    });
    return response.data;
  }

  async getSchedules() {
    const headers = await this.getHeaders();
    const response = await axios.get(`${API_BASE_URL}/schedules`, { headers });
    return response.data;
  }

  async getSchedule(id: string) {
    const headers = await this.getHeaders();
    const response = await axios.get(`${API_BASE_URL}/schedules/${id}`, { headers });
    return response.data;
  }

  async createSchedule(data: any) {
    const headers = await this.getHeaders();
    const response = await axios.post(`${API_BASE_URL}/schedules`, data, { headers });
    return response.data;
  }

  async updateSchedule(id: string, data: any) {
    const headers = await this.getHeaders();
    const response = await axios.patch(`${API_BASE_URL}/schedules/${id}`, data, { headers });
    return response.data;
  }

  async deleteSchedule(id: string) {
    const headers = await this.getHeaders();
    const response = await axios.delete(`${API_BASE_URL}/schedules/${id}`, { headers });
    return response.data;
  }

  async testConnection() {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get(`${API_BASE_URL}/event-types`, { headers });
      return { success: true, data: response.data };
    } catch (error: any) {
      console.error("API Connection Error:", error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data,
      };
    }
  }
}

export default new ApiService();
