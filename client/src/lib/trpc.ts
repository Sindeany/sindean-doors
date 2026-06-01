import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "../../../server/routers";

export const trpc = createTRPCReact<AppRouter>();

export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: "/api/trpc",
        transformer: superjson,
        headers() {
          const headers: Record<string, string> = {};
          // Admin token is handled via httpOnly cookie — do not send in headers
          // Supplier token is stored as JSON { token, supplier } under "supplier_auth"
          try {
            const raw = localStorage.getItem("supplier_auth");
            if (raw) {
              const supplierToken = (JSON.parse(raw) as { token?: string })
                ?.token;
              if (supplierToken) headers["x-supplier-token"] = supplierToken;
            }
          } catch {
            /* ignore malformed storage */
          }
          const userToken = localStorage.getItem("sindian_user_token");
          if (userToken) headers["x-user-token"] = userToken;
          return headers;
        },
        fetch(url, options) {
          // Include credentials so httpOnly cookies are sent with every request
          return fetch(url, { ...options, credentials: "include" });
        },
      }),
    ],
  });
}
