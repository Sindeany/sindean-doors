import { createRoot } from "react-dom/client";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { trpc, createTRPCClient } from "./lib/trpc";
import "./index.css";

function Root() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (failureCount, error: unknown) => {
              // لا تعيد المحاولة عند خطأ UNAUTHORIZED
              if (
                (error as { data?: { code?: string } })?.data?.code ===
                "UNAUTHORIZED"
              )
                return false;
              return failureCount < 2;
            },
          },
          mutations: {
            onError: (error: unknown) => {
              if (
                (error as { data?: { code?: string } })?.data?.code ===
                "UNAUTHORIZED"
              ) {
                // Admin session is cookie-based; redirect to login on auth failure
                window.location.href = "/admin/login";
              }
            },
          },
        },
      })
  );
  const [trpcClient] = useState(() => createTRPCClient());

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </trpc.Provider>
  );
}

createRoot(document.getElementById("root")!).render(<Root />);
