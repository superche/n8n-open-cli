import fetch, { Response, RequestInit } from 'node-fetch';

export interface ApiClientConfig {
  baseUrl: string;
  apiKey: string;
}

export interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  code?: number;
  nextCursor?: string;
}

export class ApiClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.apiKey = config.apiKey;
  }

  private getHeaders(): Record<string, string> {
    return {
      'X-N8N-API-KEY': this.apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(`${this.baseUrl}/api/v1${path}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.append(key, String(value));
        }
      });
    }
    return url.toString();
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const text = await response.text();

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status} ${response.statusText}`;
      try {
        const errorBody = JSON.parse(text);
        if (errorBody.message) {
          errorMessage = errorBody.message;
        }
      } catch {
        // ignore
      }
      return { ok: false, error: errorMessage, code: response.status };
    }

    if (!text) return { ok: true };

    try {
      const parsed = JSON.parse(text);
      // n8n API returns { data: [...], nextCursor } for lists
      if (parsed.data !== undefined) {
        return { ok: true, data: parsed.data, nextCursor: parsed.nextCursor };
      }
      return { ok: true, data: parsed as T };
    } catch {
      return { ok: true, data: text as unknown as T };
    }
  }

  async get<T = any>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<ApiResponse<T>> {
    const url = this.buildUrl(path, params);
    const response = await fetch(url, { method: 'GET', headers: this.getHeaders() });
    return this.handleResponse<T>(response);
  }

  async post<T = any>(path: string, body?: unknown, params?: Record<string, string | number | boolean | undefined>): Promise<ApiResponse<T>> {
    const url = this.buildUrl(path, params);
    const options: RequestInit = { method: 'POST', headers: this.getHeaders() };
    if (body !== undefined) options.body = JSON.stringify(body);
    const response = await fetch(url, options);
    return this.handleResponse<T>(response);
  }

  async put<T = any>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    const url = this.buildUrl(path);
    const options: RequestInit = { method: 'PUT', headers: this.getHeaders() };
    if (body !== undefined) options.body = JSON.stringify(body);
    const response = await fetch(url, options);
    return this.handleResponse<T>(response);
  }

  async patch<T = any>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    const url = this.buildUrl(path);
    const options: RequestInit = { method: 'PATCH', headers: this.getHeaders() };
    if (body !== undefined) options.body = JSON.stringify(body);
    const response = await fetch(url, options);
    return this.handleResponse<T>(response);
  }

  async delete<T = any>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<ApiResponse<T>> {
    const url = this.buildUrl(path, params);
    const response = await fetch(url, { method: 'DELETE', headers: this.getHeaders() });
    return this.handleResponse<T>(response);
  }
}
