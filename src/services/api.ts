export const API_URL = import.meta.env.VITE_API_URL;
export const WS_URL = import.meta.env.VITE_WS_URL;

if (!API_URL || !WS_URL) {
  throw new Error("API_URL or WS_URL is not defined");
}

class ApiClient {
  private getHeaders(includeAuth: boolean = true): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (includeAuth) {
      const token = localStorage.getItem("accessToken");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  private getAuthHeaders(includeAuth: boolean = true): HeadersInit {
    const headers: HeadersInit = {};

    if (includeAuth) {
      const token = localStorage.getItem("accessToken");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  async get(endpoint: string, includeAuth: boolean = true) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "GET",
      headers: this.getHeaders(includeAuth),
      credentials: "include",
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403 || response.status === 500) {
        // Backend returns 500 for expired tokens sometimes, catch-all safety
        window.dispatchEvent(new Event('auth:logout'));
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API Error: ${response.status}`);
    }

    return response.json();
  }

  async post<T>(endpoint: string, data: T, includeAuth: boolean = true) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      headers: this.getHeaders(includeAuth),
      body: JSON.stringify(data),
      credentials: "include",
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403 || response.status === 500) {
        window.dispatchEvent(new Event('auth:logout'));
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API Error: ${response.status}`);
    }

    return response.json();
  }

  async postFormData(endpoint: string, data: any, includeAuth: boolean = true) {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, value as string);
    });

    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      headers: this.getAuthHeaders(includeAuth),
      body: formData,
      credentials: "include",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API Error: ${response.status}`);
    }

    return response.json();
  }

  async put<T>(endpoint: string, data?: T, includeAuth: boolean = true) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "PUT",
      headers: this.getHeaders(includeAuth),
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403 || response.status === 500) {
        window.dispatchEvent(new Event('auth:logout'));
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API Error: ${response.status}`);
    }

    return response.json();
  }

  async delete(endpoint: string, includeAuth: boolean = true) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "DELETE",
      headers: this.getHeaders(includeAuth),
      credentials: "include",
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403 || response.status === 500) {
        window.dispatchEvent(new Event('auth:logout'));
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API Error: ${response.status}`);
    }

    return response.json();
  }
}

export const apiClient = new ApiClient();
