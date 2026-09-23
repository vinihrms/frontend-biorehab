import type { Session } from "../domain/types";

const SESSION_KEY = "rehabdata.session";
export const UNAUTHORIZED_EVENT = "rehabdata:unauthorized";
export function readSession(): Session | null {
  try {
    const s = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
    return typeof s?.token === "string" &&
      typeof s?.user?.id === "number" &&
      typeof s?.user?.isAdmin === "boolean"
      ? s
      : null;
  } catch {
    return null;
  }
}
export function storeSession(session: Session | null) {
  if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else sessionStorage.removeItem(SESSION_KEY);
}
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: { field: string; message: string }[],
  ) {
    super(message);
  }
}
const base = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
export async function request<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    signal?: AbortSignal;
    public?: boolean;
    download?: boolean;
  } = {},
): Promise<T> {
  const token = options.public ? undefined : readSession()?.token;
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method: options.method || "GET",
      headers: {
        ...(options.body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "Não foi possível conectar. Verifique a conexão e tente novamente.",
    );
  }
  if (response.status === 401 && token && token === readSession()?.token) {
    storeSession(null);
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }
  if (
    options.download &&
    response.ok &&
    response.headers.get("content-type")?.includes("text/csv")
  )
    return (await response.blob()) as T;
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.success !== true) {
    throw new ApiError(
      response.status,
      data?.error?.code || "HTTP_ERROR",
      data?.error?.message ||
        (response.status >= 500
          ? "O serviço está indisponível. Tente novamente em instantes."
          : "Não foi possível concluir a solicitação."),
      data?.error?.details,
    );
  }
  return data.data as T;
}
export async function downloadStudy(id: number, body: unknown) {
  const blob = await request<Blob>(`/estudos/${id}/exportar`, {
    method: "POST",
    body,
    download: true,
  });
  if (!blob.size)
    throw new ApiError(
      200,
      "EMPTY_EXPORT",
      "Não há dados para exportar com essa seleção.",
    );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `estudo-${id}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
