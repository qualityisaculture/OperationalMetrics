import { useState, useEffect, useCallback } from "react";
import { message } from "antd";

export type EstimatesMap = Record<string, number | null>; // issueKey -> estimatedDays

export const useEstimates = (
  filteredData: any[],
  issueKeyIndex: number
) => {
  const [estimates, setEstimates] = useState<EstimatesMap>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extractUniqueIssueKeys = useCallback((): string[] => {
    if (issueKeyIndex === -1 || filteredData.length === 0) {
      return [];
    }

    const issueKeys = new Set<string>();
    filteredData.forEach((row) => {
      const issueKey = row[issueKeyIndex.toString()];
      if (issueKey) {
        const key = String(issueKey).trim();
        if (key && key.startsWith("LEN-")) {
          issueKeys.add(key);
        }
      }
    });

    return Array.from(issueKeys);
  }, [filteredData, issueKeyIndex]);

  const fetchEstimates = useCallback(async () => {
    const issueKeys = extractUniqueIssueKeys();

    if (issueKeys.length === 0) {
      setEstimates({});
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log(`Fetching estimates for ${issueKeys.length} issues`);

      const response = await fetch("/api/tempo-analyzer/estimates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ issueKeys }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const estimatesData: EstimatesMap = JSON.parse(result.data);

      console.log(
        `Successfully fetched estimates for ${Object.keys(estimatesData).length} issues`
      );

      setEstimates(estimatesData);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch estimates";
      console.error("Error fetching estimates:", err);
      setError(errorMessage);
      message.error(`Failed to fetch estimates: ${errorMessage}`);
      setEstimates({});
    } finally {
      setIsLoading(false);
    }
  }, [extractUniqueIssueKeys]);

  // Reset when filtered data changes
  useEffect(() => {
    setEstimates({});
  }, [filteredData, issueKeyIndex]);

  return {
    estimates,
    isLoading,
    error,
    fetchEstimates,
  };
};
