import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

// Exponer queryClient globalmente para invalidación desde el store
(window as any).__REACT_QUERY_CLIENT__ = queryClient;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster
        richColors
        expand={false}
        closeButton
        toastOptions={{
          style: {
            fontFamily: "Satoshi, Inter, system-ui, sans-serif",
            fontSize: "14px",
            borderRadius: "6px",
          },
          duration: 4000,
        }}
      />
    </QueryClientProvider>
  </React.StrictMode>,
);
