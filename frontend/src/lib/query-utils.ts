import { useQueryClient } from "@tanstack/react-query";

// Hook para acceder al queryClient desde cualquier componente
export const useGlobalQueryClient = () => {
  return useQueryClient();
};

// Función para invalidar queries globalmente (útil para auth changes)
export const invalidateAllQueries = () => {
  if (typeof window !== "undefined") {
    const queryClient = (window as any).__REACT_QUERY_CLIENT__;
    if (queryClient) {
      queryClient.invalidateQueries();
    }
  }
};

// Función para limpiar cache completamente
export const clearAllQueries = () => {
  if (typeof window !== "undefined") {
    const queryClient = (window as any).__REACT_QUERY_CLIENT__;
    if (queryClient) {
      queryClient.clear();
    }
  }
};
