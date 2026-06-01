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
        // All auth tokens are transmitted via httpOnly cookies.
        // credentials: "include" (below) ensures cookies are sent automatically.
        // No tokens are read from or stored in localStorage.
        headers: () => ({}),
        fetch(url, options) {
          // Include credentials so httpOnly cookies are sent with every request
          return fetch(url, { ...options, credentials: "include" });
        },
      }),
    ],
  });
}
