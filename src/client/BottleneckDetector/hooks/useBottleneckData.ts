import { useState, useCallback } from "react";
import { LiteJiraIssue, BottleneckDetectorResponse } from "../types";

export const useBottleneckData = (projectName: string) => {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<LiteJiraIssue[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jqlQuery, setJqlQuery] = useState<string>("");

  const fetchData = useCallback(
    async (query: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/bottleneck-detector?project=${encodeURIComponent(projectName)}&jql=${encodeURIComponent(query)}`
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result: BottleneckDetectorResponse = await response.json();
        const parsedData = JSON.parse(result.data) as LiteJiraIssue[];

        setData(parsedData);
        setJqlQuery(query);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "An error occurred while fetching data"
        );
        setData(null);
      } finally {
        setIsLoading(false);
      }
    },
    [projectName]
  );

  const clearData = useCallback(() => {
    setData(null);
    setError(null);
    setJqlQuery("");
  }, []);

  return {
    isLoading,
    data,
    error,
    jqlQuery,
    fetchData,
    clearData,
  };
};
