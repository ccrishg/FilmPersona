import type { Analysis } from "./types";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = await response.json();
      if (typeof body.detail === "string") detail = body.detail;
    } catch {
      // non-JSON error body — keep the status text
    }
    throw new ApiError(response.status, detail);
  }
  return response.json() as Promise<T>;
}

export function createAnalysis(username: string): Promise<{ id: string }> {
  return request("/api/analyses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });
}

export function importExportZip(file: File): Promise<{ id: string }> {
  const form = new FormData();
  form.append("file", file);
  return request("/api/analyses/import", { method: "POST", body: form });
}

export function getAnalysis(id: string): Promise<Analysis> {
  return request(`/api/analyses/${id}`);
}
