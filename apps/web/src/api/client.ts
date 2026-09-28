import type {
  CompareInput,
  CompareResponse,
  PlaceFeature,
  SavedComparison,
  User,
  RateVersion,
  RateParameter,
} from '../types';

export class ApiError extends Error {
  code: string;
  status: number;
  details?: any;

  constructor(code: string, message: string, status: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
    credentials: 'include', // Automatically passes and sets the httpOnly JWT cookie
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const errorObj = data?.error;
    throw new ApiError(
      errorObj?.code || 'UNKNOWN_ERROR',
      errorObj?.message || response.statusText || 'An unexpected error occurred',
      response.status,
      errorObj?.details,
    );
  }

  return data as T;
}

export const api = {
  // Compare
  async compare(input: CompareInput): Promise<CompareResponse> {
    return request<CompareResponse>('/api/compare', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async getComparison(id: string): Promise<{ id: string; input: CompareInput; result: CompareResponse }> {
    return request<{ id: string; input: CompareInput; result: CompareResponse }>(`/api/compare/${id}`);
  },

  // Places autocomplete
  async searchPlaces(query: string): Promise<PlaceFeature[]> {
    if (!query || query.trim().length < 2) return [];
    try {
      const res = await request<{ features: PlaceFeature[] }>(
        `/api/places?q=${encodeURIComponent(query.trim())}`,
      );
      return res.features || [];
    } catch {
      return [];
    }
  },

  // Auth
  async register(email: string, password: string): Promise<{ user: User }> {
    return request<{ user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async login(email: string, password: string): Promise<{ user: User }> {
    return request<{ user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async logout(): Promise<void> {
    await request('/api/auth/logout', { method: 'POST' });
  },

  async getMe(): Promise<{ user: User }> {
    return request<{ user: User }>('/api/auth/me');
  },

  // Saved Comparisons
  async getSaved(): Promise<SavedComparison[]> {
    return request<SavedComparison[]>('/api/saved');
  },

  async saveComparison(comparisonId: string, label?: string): Promise<SavedComparison> {
    return request<SavedComparison>(`/api/saved/${comparisonId}`, {
      method: 'POST',
      body: JSON.stringify({ label }),
    });
  },

  async deleteSaved(id: string | number): Promise<void> {
    await request(`/api/saved/${id}`, { method: 'DELETE' });
  },

  // Admin
  async getAdminRates(): Promise<{ versions: RateVersion[]; activeParameters: RateParameter[] }> {
    return request<{ versions: RateVersion[]; activeParameters: RateParameter[] }>('/api/admin/rates');
  },

  async createAdminRates(
    note: string,
    parameters: Array<{
      key: string;
      value: number;
      unit: string;
      description: string;
      sourceNote?: string;
    }>,
  ): Promise<{ versionId: number }> {
    return request<{ versionId: number }>('/api/admin/rates', {
      method: 'POST',
      body: JSON.stringify({ note, parameters }),
    });
  },
};
