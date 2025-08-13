import { useState, useEffect, useCallback } from "react";
import { Queue, UnassignedStatus } from "../types";
import { LiteJiraIssue } from "../../../server/JiraRequester";

const QUEUES_STORAGE_KEY = "bottleneck-detector-queues";

export const useQueueManager = (projectName: string) => {
  const [queues, setQueues] = useState<Queue[]>([]);

  // Load queues from localStorage on mount
  useEffect(() => {
    const savedQueues = localStorage.getItem(
      `${QUEUES_STORAGE_KEY}-${projectName}`
    );
    if (savedQueues) {
      try {
        setQueues(JSON.parse(savedQueues));
      } catch (error) {
        console.error("Failed to parse saved queues:", error);
        setQueues([]);
      }
    }
  }, [projectName]);

  // Save queues to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(
      `${QUEUES_STORAGE_KEY}-${projectName}`,
      JSON.stringify(queues)
    );
  }, [queues, projectName]);

  // Get unique statuses from issues
  const getUniqueStatuses = useCallback(
    (issues: LiteJiraIssue[]): UnassignedStatus[] => {
      const statusCounts: { [key: string]: number } = {};

      issues.forEach((issue) => {
        statusCounts[issue.status] = (statusCounts[issue.status] || 0) + 1;
      });

      return Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count,
      }));
    },
    []
  );

  // Get unassigned statuses (statuses not assigned to any queue)
  const getUnassignedStatuses = useCallback(
    (issues: LiteJiraIssue[]): UnassignedStatus[] => {
      const allStatuses = getUniqueStatuses(issues);
      const assignedStatuses = queues.flatMap((q) => q.statuses);

      return allStatuses.filter((s) => !assignedStatuses.includes(s.status));
    },
    [queues, getUniqueStatuses]
  );

  // Get issues that don't match any queue
  const getUncategorizedIssues = useCallback(
    (issues: LiteJiraIssue[]): LiteJiraIssue[] => {
      const assignedStatuses = queues.flatMap((q) => q.statuses);
      return issues.filter((issue) => !assignedStatuses.includes(issue.status));
    },
    [queues]
  );

  // Get issues for a specific queue
  const getIssuesForQueue = useCallback(
    (queueId: string, issues: LiteJiraIssue[]): LiteJiraIssue[] => {
      const queue = queues.find((q) => q.id === queueId);
      if (!queue) return [];

      return issues.filter((issue) => queue.statuses.includes(issue.status));
    },
    [queues]
  );

  // Update queues
  const updateQueues = useCallback((newQueues: Queue[]) => {
    setQueues(newQueues);
  }, []);

  // Add a new queue
  const addQueue = useCallback(
    (name: string) => {
      const newQueue: Queue = {
        id: `queue-${Date.now()}`,
        name: name.trim(),
        statuses: [],
        order: queues.length,
      };
      setQueues((prev) => [...prev, newQueue]);
    },
    [queues.length]
  );

  // Delete a queue
  const deleteQueue = useCallback((queueId: string) => {
    setQueues((prev) => prev.filter((q) => q.id !== queueId));
  }, []);

  // Update queue name
  const updateQueueName = useCallback((queueId: string, name: string) => {
    setQueues((prev) =>
      prev.map((q) => (q.id === queueId ? { ...q, name: name.trim() } : q))
    );
  }, []);

  // Add status to queue
  const addStatusToQueue = useCallback((queueId: string, status: string) => {
    setQueues((prev) =>
      prev.map((q) =>
        q.id === queueId ? { ...q, statuses: [...q.statuses, status] } : q
      )
    );
  }, []);

  // Remove status from queue
  const removeStatusFromQueue = useCallback(
    (queueId: string, status: string) => {
      setQueues((prev) =>
        prev.map((q) =>
          q.id === queueId
            ? { ...q, statuses: q.statuses.filter((s) => s !== status) }
            : q
        )
      );
    },
    []
  );

  // Move queue up or down
  const moveQueue = useCallback((queueId: string, direction: "up" | "down") => {
    setQueues((prev) => {
      const newQueues = [...prev];
      const currentIndex = newQueues.findIndex((q) => q.id === queueId);

      if (currentIndex === -1) return prev;

      if (direction === "up" && currentIndex > 0) {
        [newQueues[currentIndex], newQueues[currentIndex - 1]] = [
          newQueues[currentIndex - 1],
          newQueues[currentIndex],
        ];
      } else if (direction === "down" && currentIndex < newQueues.length - 1) {
        [newQueues[currentIndex], newQueues[currentIndex + 1]] = [
          newQueues[currentIndex + 1],
          newQueues[currentIndex],
        ];
      }

      // Update order numbers
      newQueues.forEach((q, index) => {
        q.order = index;
      });

      return newQueues;
    });
  }, []);

  // Clear all queues
  const clearQueues = useCallback(() => {
    setQueues([]);
  }, []);

  return {
    queues,
    updateQueues,
    addQueue,
    deleteQueue,
    updateQueueName,
    addStatusToQueue,
    removeStatusFromQueue,
    moveQueue,
    clearQueues,
    getUniqueStatuses,
    getUnassignedStatuses,
    getUncategorizedIssues,
    getIssuesForQueue,
  };
};
