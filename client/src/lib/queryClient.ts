import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { API_URL } from "./api"; // <-- importa la URL base

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  endpoint: string,      // renombré url a endpoint para que se entienda mejor
  data?: unknown | undefined,
): Promise<Response> {
  const url = `${API_URL}${endpoint}`;  // concatenar base + endpoint

  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = `${API_URL}${queryKey[0] as string}`;  // concatenar base + endpoint

    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: 5000, // Refetch every 5 seconds
      refetchOnWindowFocus: true,
      staleTime: 1000 * 10, // 10 seconds
      refetchIntervalInBackground: true,
      retry: 1,
    },
    mutations: {
      retry: false,
      onSuccess: () => {
        // Invalidate all queries after successful mutations
        queryClient.invalidateQueries();
        queryClient.refetchQueries();
      },
    },
  },
});
