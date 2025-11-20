import axios from 'axios';
import { EventTypesResponse } from '../types/eventType';

const API_BASE_URL = 'https://api.cal.com/v2';
const API_KEY = ''; // User needs to provide their API key

const calApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

calApi.interceptors.request.use((config) => {
  if (API_KEY) {
    config.headers.Authorization = `Bearer ${API_KEY}`;
  }
  return config;
});

export const getEventTypes = async (): Promise<EventTypesResponse> => {
  try {
    const response = await calApi.get<EventTypesResponse>('/event-types');
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || 'Failed to fetch event types'
      );
    }
    throw error;
  }
};

export default calApi;
