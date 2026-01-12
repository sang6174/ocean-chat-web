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

  private refreshPromise: Promise<string | null> | null = null;

  private async refreshAuthToken(): Promise<string | null> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_URL}/v1/auth/refresh`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include", // Send cookies
        });

        if (!response.ok) {
          throw new Error("Refresh failed");
        }

        const data = await response.json();
        const newAccessToken = data.accessToken;

        if (newAccessToken) {
          localStorage.setItem("accessToken", newAccessToken);
          return newAccessToken;
        }
        return null;
      } catch (error) {
        console.error("Auto-refresh token failed:", error);
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private async fetchWithAuth(
    endpoint: string,
    options: RequestInit,
    includeAuth: boolean
  ): Promise<any> {
    // 1. Initial Fetch
    // We clone headers to ensure we don't mutate the original options for retry
    let headers: HeadersInit = { ...options.headers };
    if (includeAuth) {
      const token = localStorage.getItem("accessToken");
      if (token) {
        headers = { ...headers, Authorization: `Bearer ${token}` };
      }
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // 2. Success Case
    if (response.ok) {
      // Setup successful
      return response.json();
    }

    // 3. Handle 401 (Unauthorized) -> Try Refresh
    if (response.status === 401) {
      console.warn(`API 401 detected for ${endpoint}. Attempting refresh...`);

      const newToken = await this.refreshAuthToken();

      if (newToken) {
        console.log("Token refreshed. Retrying request...");
        // Update headers with new token
        const retryHeaders = {
          ...options.headers,
          Authorization: `Bearer ${newToken}`
        };

        // Retry the request
        const retryResponse = await fetch(`${API_URL}${endpoint}`, {
          ...options,
          headers: retryHeaders,
        });

        if (retryResponse.ok) {
          return retryResponse.json();
        }
      } else {
        console.error("Refresh failed or returned no token.");
      }

      // If refresh failed or retry failed, fall through to error handling
      // which usually means Logout
      window.dispatchEvent(new Event('auth:logout'));
    } else if (response.status === 403 || response.status === 500) {
      // Optional: specific handling for other codes
      if (response.status === 403) {
        // Sometimes 403 is also an auth issue, but usually permissions.
        // Leaving strictly as-is for now or dispatching logout if appropriate
      }
    }

    // 4. General Error Handling
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API Error: ${response.status}`);
  }

  async get(endpoint: string, includeAuth: boolean = true) {
    return this.fetchWithAuth(endpoint, {
      method: "GET",
      // Headers generated inside fetchWithAuth based on includeAuth
      headers: this.getHeaders(false), // Base headers
      credentials: "include",
    }, includeAuth);
  }

  async post<T>(endpoint: string, data: T, includeAuth: boolean = true) {
    return this.fetchWithAuth(endpoint, {
      method: "POST",
      headers: this.getHeaders(false),
      body: JSON.stringify(data),
      credentials: "include",
    }, includeAuth);
  }

  async postFormData(endpoint: string, data: any, includeAuth: boolean = true) {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, value as string);
    });

    // For FormData, we don't set Content-Type header manually (browser does it)
    // getAuthHeaders vs getHeaders needs care.
    // Let's simplified this: 
    // We can't reuse fetchWithAuth easily for FormData if we need to micromanage headers 
    // because fetchWithAuth tries to JSON/Auth logic.
    // However, refresh logic is same. 
    // Let's handle FormData manually or adapt fetchWithAuth

    // Adaptation for FormData: 
    const token = localStorage.getItem("accessToken");
    const headers: any = {};
    if (includeAuth && token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      headers: headers, // No Content-Type
      body: formData,
      credentials: "include"
    });

    if (response.ok) return response.json();

    if (response.status === 401) {
      const newToken = await this.refreshAuthToken();
      if (newToken) {
        headers["Authorization"] = `Bearer ${newToken}`;
        const retryResponse = await fetch(`${API_URL}${endpoint}`, {
          method: "POST",
          headers: headers,
          body: formData,
          credentials: "include"
        });
        if (retryResponse.ok) return retryResponse.json();
      }
      window.dispatchEvent(new Event('auth:logout'));
    }

    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API Error: ${response.status}`);
  }

  async put<T>(endpoint: string, data?: T, includeAuth: boolean = true) {
    return this.fetchWithAuth(endpoint, {
      method: "PUT",
      headers: this.getHeaders(false),
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    }, includeAuth);
  }

  async delete(endpoint: string, includeAuth: boolean = true) {
    return this.fetchWithAuth(endpoint, {
      method: "DELETE",
      headers: this.getHeaders(false),
      credentials: "include",
    }, includeAuth);
  }
}

export const apiClient = new ApiClient();
