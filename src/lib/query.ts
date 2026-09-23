import {
  QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ApiError, request } from "./api";
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (count, error) =>
        count < 1 &&
        (!(error instanceof ApiError) ||
          error.status >= 500 ||
          error.status === 0),
      refetchOnWindowFocus: false,
    },
    mutations: { retry: false },
  },
});
export function useResource<T>(path: string, enabled = true) {
  return useQuery({
    queryKey: ["api", path],
    queryFn: ({ signal }) => request<T>(path, { signal }),
    enabled,
  });
}
export function useWrite() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      path,
      method = "POST",
      body,
    }: {
      path: string;
      method?: string;
      body?: unknown;
    }) => request(path, { method, body }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["api"] }),
  });
}
