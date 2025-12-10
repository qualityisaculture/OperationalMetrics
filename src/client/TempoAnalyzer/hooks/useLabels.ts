import { useState, useEffect, useCallback } from "react";
import { message } from "antd";

export type LabelsMap = Record<string, string[]>; // issueKey -> labels[]

export const useLabels = (
  filteredData: any[],
  issueKeyIndex: number
) => {
  const [labels, setLabels] = useState<LabelsMap>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract unique issue keys from filtered data
  const extractUniqueIssueKeys = useCallback((): string[] => {
    if (issueKeyIndex === -1 || filteredData.length === 0) {
      return [];
    }

    const issueKeys = new Set<string>();
    filteredData.forEach((row) => {
      const issueKey = row[issueKeyIndex.toString()];
      if (issueKey) {
        const key = String(issueKey).trim();
        if (key) {
          issueKeys.add(key);
        }
      }
    });

    return Array.from(issueKeys);
  }, [filteredData, issueKeyIndex]);

  // Fetch labels from the API
  const fetchLabels = useCallback(async () => {
    const issueKeys = extractUniqueIssueKeys();

    if (issueKeys.length === 0) {
      setLabels({});
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log(`Fetching labels for ${issueKeys.length} issues`);

      const response = await fetch("/api/tempo-analyzer/labels", {
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
      const labelsData: LabelsMap = JSON.parse(result.data);

      console.log(
        `Successfully fetched labels for ${Object.keys(labelsData).length} issues`
      );

      setLabels(labelsData);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch labels";
      console.error("Error fetching labels:", err);
      setError(errorMessage);
      message.error(`Failed to fetch labels: ${errorMessage}`);
      setLabels({});
    } finally {
      setIsLoading(false);
    }
  }, [extractUniqueIssueKeys]);

  // Reset labels when filtered data changes (but don't auto-fetch)
  useEffect(() => {
    // Clear labels when data changes, but don't fetch automatically
    setLabels({});
  }, [filteredData, issueKeyIndex]);

  // Get all unique labels from the labels map
  const getAllLabels = useCallback((): string[] => {
    const allLabels = new Set<string>();
    Object.values(labels).forEach((labelArray) => {
      labelArray.forEach((label) => allLabels.add(label));
    });
    return Array.from(allLabels).sort();
  }, [labels]);

  return {
    labels,
    isLoading,
    error,
    fetchLabels,
    extractUniqueIssueKeys,
    getAllLabels,
  };
};

