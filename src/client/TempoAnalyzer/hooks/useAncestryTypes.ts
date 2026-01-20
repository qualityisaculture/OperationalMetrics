import { useMemo, useCallback } from "react";
import { ParentAncestorsMap } from "./useParentAncestors";

// Helper function to determine ancestor type from ancestors array
const getAncestorType = (
  ancestors: Array<{ key: string; summary: string; type: string }> | undefined
): string => {
  if (!ancestors || ancestors.length === 0) {
    return "Other";
  }

  // Check for "Fault" first (higher priority)
  const hasFault = ancestors.some((ancestor) => ancestor.type === "Fault");
  if (hasFault) {
    return "Fault";
  }
  // Check for "Service Request"
  const hasIncident = ancestors.some(
    (ancestor) => ancestor.type === "Incident"
  );
  if (hasIncident) {
    return "Incident";
  }

  // Check for "Service Request"
  const hasServiceRequest = ancestors.some(
    (ancestor) => ancestor.type === "Service Request"
  );
  if (hasServiceRequest) {
    return "Service Request";
  }

  // Check for "Enquiry"
  const hasEnquiry = ancestors.some((ancestor) => ancestor.type === "Enquiry");
  if (hasEnquiry) {
    return "Enquiry";
  }

  // Check for "Enhancement"
  const hasEnhancement = ancestors.some(
    (ancestor) => ancestor.type === "Enhancement"
  );
  if (hasEnhancement) {
    return "Enhancement";
  }

  // Check for "Problem Management"
  const hasProblemManagement = ancestors.some(
    (ancestor) => ancestor.type === "Problem Management"
  );
  if (hasProblemManagement) {
    return "Problem Management";
  }

  return "Other";
};

// Helper function to determine ancestry type from both ancestors and issue type
const getAncestryType = (
  ancestors: Array<{ key: string; summary: string; type: string }> | undefined,
  issueType: string | null,
  issueKey: string | null
): string => {
  // First check ancestors
  const ancestorType = getAncestorType(ancestors);

  const type = String(issueType || "").trim();
  if (type === "Bug") {
    return "Bug";
  }

  // If ancestor type is already one of the special types, use it
  if (
    ancestorType === "Fault" ||
    ancestorType === "Service Request" ||
    ancestorType === "Incident" ||
    ancestorType === "Enquiry" ||
    ancestorType === "Enhancement" ||
    ancestorType === "Problem Management"
  ) {
    return ancestorType;
  }

  // Otherwise, check the issue type
  if (issueType) {
    if (type === "Fault") {
      return "Fault";
    }
    if (type === "Service Request") {
      return "Service Request";
    }
    if (type === "Incident") {
      return "Incident";
    }
    if (type === "Enquiry") {
      return "Enquiry";
    }
    if (type === "Enhancement") {
      return "Enhancement";
    }
    if (type === "Problem Management") {
      return "Problem Management";
    }
  }

  // If nothing else matches, check if issue key starts with "GEM"
  if (issueKey && String(issueKey).trim().toUpperCase().startsWith("GEM")) {
    return "GEM";
  }

  return "Other";
};

export type AncestryTypesMap = Record<string, string>; // issueKey -> ancestryType

export const useAncestryTypes = (
  filteredData: any[],
  issueKeyIndex: number,
  issueTypeIndex: number,
  parentAncestors: ParentAncestorsMap
) => {
  // Map issue keys to their ancestry types
  const ancestryTypes = useMemo<AncestryTypesMap>(() => {
    const typesMap: AncestryTypesMap = {};

    if (issueKeyIndex === -1 || filteredData.length === 0) {
      return typesMap;
    }

    filteredData.forEach((row) => {
      const issueKey = row[issueKeyIndex.toString()];
      if (issueKey) {
        const key = String(issueKey).trim();
        if (key) {
          const issueType =
            issueTypeIndex !== -1 ? row[issueTypeIndex.toString()] : null;
          const ancestors = parentAncestors[key] || undefined;
          const ancestryType = getAncestryType(ancestors, issueType, key);
          typesMap[key] = ancestryType;
        }
      }
    });

    return typesMap;
  }, [filteredData, issueKeyIndex, issueTypeIndex, parentAncestors]);

  // Get all unique ancestry types from the map
  const getAllAncestryTypes = useCallback((): string[] => {
    const allTypes = new Set<string>();
    Object.values(ancestryTypes).forEach((type) => {
      if (type) {
        allTypes.add(type);
      }
    });
    return Array.from(allTypes).sort();
  }, [ancestryTypes]);

  return {
    ancestryTypes,
    getAllAncestryTypes,
  };
};
