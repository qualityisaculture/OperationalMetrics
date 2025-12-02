import { useState, useEffect, useCallback } from "react";
import { message } from "antd";

export type ParentAncestor = {
  key: string;
  summary: string;
  type: string;
};

export type ParentAncestorsMap = Record<string, ParentAncestor[]>;

export const useParentAncestors = (
  filteredData: any[],
  issueKeyIndex: number
) => {
  const [parentAncestors, setParentAncestors] = useState<ParentAncestorsMap>(
    {}
  );
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

  // Fetch parent ancestors from the API
  const fetchParentAncestors = useCallback(async () => {
    const issueKeys = extractUniqueIssueKeys();

    if (issueKeys.length === 0) {
      setParentAncestors({});
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log(`Fetching parent ancestors for ${issueKeys.length} issues`);

      const response = await fetch("/api/tempo-analyzer/parent-ancestors", {
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
      const ancestorsData: ParentAncestorsMap = JSON.parse(result.data);

      console.log(
        `Successfully fetched parent ancestors for ${Object.keys(ancestorsData).length} issues`
      );

      setParentAncestors(ancestorsData);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch parent ancestors";
      console.error("Error fetching parent ancestors:", err);
      setError(errorMessage);
      message.error(`Failed to fetch parent ancestors: ${errorMessage}`);
      setParentAncestors({});
    } finally {
      setIsLoading(false);
    }
  }, [extractUniqueIssueKeys]);

  // Reset ancestors when filtered data changes (but don't auto-fetch)
  useEffect(() => {
    // Clear ancestors when data changes, but don't fetch automatically
    setParentAncestors({});
  }, [filteredData, issueKeyIndex]);

  return {
    parentAncestors,
    isLoading,
    error,
    fetchParentAncestors,
    extractUniqueIssueKeys,
  };
};
