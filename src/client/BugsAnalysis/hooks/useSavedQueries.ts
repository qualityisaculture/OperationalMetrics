import { useState, useEffect } from "react";

export interface SavedQuery {
  name: string;
  query: string;
  id: string;
}

const STORAGE_KEY = "bugsAnalysisSavedQueries";

export const useSavedQueries = () => {
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);

  // Load saved queries from localStorage on mount
  useEffect(() => {
    const loadSavedQueries = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const queries = JSON.parse(stored);
          setSavedQueries(queries);
        }
      } catch (error) {
        console.error("Error loading saved queries:", error);
      }
    };
    loadSavedQueries();
  }, []);

  const saveQuery = (name: string, query: string): boolean => {
    if (!name.trim() || !query.trim()) {
      return false;
    }

    try {
      const newQuery: SavedQuery = {
        name: name.trim(),
        query: query.trim(),
        id: Date.now().toString(),
      };

      const updatedQueries = [...savedQueries, newQuery];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedQueries));
      setSavedQueries(updatedQueries);
      return true;
    } catch (error) {
      console.error("Error saving query:", error);
      return false;
    }
  };

  const deleteQuery = (id: string): boolean => {
    try {
      const updatedQueries = savedQueries.filter((q) => q.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedQueries));
      setSavedQueries(updatedQueries);
      return true;
    } catch (error) {
      console.error("Error deleting query:", error);
      return false;
    }
  };

  const loadQuery = (id: string): string | null => {
    const query = savedQueries.find((q) => q.id === id);
    return query ? query.query : null;
  };

  return {
    savedQueries,
    saveQuery,
    deleteQuery,
    loadQuery,
  };
};

