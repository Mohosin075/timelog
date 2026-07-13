const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export class ApiError extends Error {
  public statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';
  }
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('timelog_token');
}

function buildHeaders(contentType = true): HeadersInit {
  const headers: Record<string, string> = {};
  if (contentType) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new ApiError(`Server error: ${res.statusText}`, res.status);
  }
  if (!res.ok) {
    const errMsg = (body && typeof body === 'object' && 'message' in body && typeof (body as Record<string, unknown>).message === 'string')
      ? ((body as Record<string, unknown>).message as string)
      : `Request failed with status ${res.status}`;
    throw new ApiError(errMsg, res.status);
  }
  return body as T;
}

export const api = {
  get: async <T>(path: string): Promise<T> => {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'GET',
      headers: buildHeaders(),
      cache: 'no-store',
    });
    return handleResponse<T>(res);
  },

  post: async <T>(path: string, body: unknown): Promise<T> => {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse<T>(res);
  },

  put: async <T>(path: string, body: unknown): Promise<T> => {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'PUT',
      headers: buildHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse<T>(res);
  },

  delete: async <T>(path: string): Promise<T> => {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'DELETE',
      headers: buildHeaders(),
    });
    return handleResponse<T>(res);
  },
};

export default api;
