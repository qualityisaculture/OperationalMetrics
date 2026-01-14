import { useState, useEffect, useCallback } from "react";

export interface UserGroup {
  id: string;
  name: string;
  users: string[];
}

export const useBitBucketGroups = () => {
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch groups from server
  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/dashboard/groups");
      const result = await response.json();
      const parsedGroups: UserGroup[] = JSON.parse(result.data);
      setGroups(parsedGroups);
    } catch (err) {
      console.error("Error fetching bitbucket groups:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch groups");
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save groups to server
  const saveGroups = useCallback(async (newGroups: UserGroup[]) => {
    try {
      setError(null);
      const response = await fetch("/api/dashboard/groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ groups: newGroups }),
      });

      if (!response.ok) {
        throw new Error("Failed to save groups");
      }

      const result = await response.json();
      const parsedGroups: UserGroup[] = JSON.parse(result.data);
      setGroups(parsedGroups);
      return parsedGroups;
    } catch (err) {
      console.error("Error saving bitbucket groups:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to save groups";
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Load groups on mount
  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  return {
    groups,
    loading,
    error,
    fetchGroups,
    saveGroups,
  };
};

