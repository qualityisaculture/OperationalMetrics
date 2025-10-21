import JiraRequester, { LiteJiraIssue } from "../JiraRequester";
import JiraReportGraphManager from "./JiraReportGraphManager";

// Progress tracking for SSE
export type OrphanDetectorProgress = {
  status: "processing" | "complete" | "error";
  step?: string;
  message?: string;
  progress?: {
    currentPhase: string;
    phaseProgress: number;
    phaseTotal: number;
    issuesProcessed: number;
    totalIssues: number;
    orphansFound: number;
    linksProcessed: number;
  };
};

// Cache for storing orphan detection results
class OrphanDetectorCache {
  private cache = new Map<string, {
    workstream: LiteJiraIssue;
    linkedIssuesWithParents: LiteJiraIssue[];
    lastUpdated: Date;
  }>();
  private readonly CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes
  private readonly MAX_CACHE_SIZE = 50; // Maximum number of cached workstreams

  setOrphanData(
    workstreamKey: string,
    workstream: LiteJiraIssue,
    linkedIssuesWithParents: LiteJiraIssue[]
  ): void {
    this.cache.set(workstreamKey, {
      workstream,
      linkedIssuesWithParents,
      lastUpdated: new Date(),
    });
    
    // Clean up if cache is too large
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      this.cleanupOldestEntries();
    }
  }

  getOrphanData(workstreamKey: string): {
    workstream: LiteJiraIssue;
    linkedIssuesWithParents: LiteJiraIssue[];
  } | null {
    const cached = this.cache.get(workstreamKey);
    if (!cached) {
      console.log(`OrphanDetectorCache miss for workstream: ${workstreamKey}`);
      return null;
    }

    const isExpired =
      Date.now() - cached.lastUpdated.getTime() > this.CACHE_DURATION_MS;
    if (isExpired) {
      this.cache.delete(workstreamKey);
      console.log(`OrphanDetectorCache expired for workstream: ${workstreamKey}`);
      return null;
    }

    console.log(`OrphanDetectorCache hit for workstream: ${workstreamKey}`);
    return {
      workstream: cached.workstream,
      linkedIssuesWithParents: cached.linkedIssuesWithParents,
    };
  }

  private cleanupOldestEntries(): void {
    const entries = Array.from(this.cache.entries());
    entries.sort(
      (a, b) => a[1].lastUpdated.getTime() - b[1].lastUpdated.getTime()
    );

    const toRemove = entries.slice(0, entries.length - this.MAX_CACHE_SIZE);
    for (const [workstreamKey] of toRemove) {
      this.cache.delete(workstreamKey);
    }

    console.log(`OrphanDetectorCache: Removed ${toRemove.length} oldest entries`);
  }

  clearCache(): void {
    this.cache.clear();
    console.log("OrphanDetectorCache: Cache cleared");
  }

  getCacheStats(): { size: number; maxSize: number; duration: number } {
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
      duration: this.CACHE_DURATION_MS,
    };
  }
}

export default class WorkstreamOrphanDetectorGraphManager {
  jiraRequester: JiraRequester;
  private sendProgress:
    | ((response: OrphanDetectorProgress) => void)
    | undefined;
  private cache: OrphanDetectorCache;

  constructor(jiraRequester: JiraRequester) {
    this.jiraRequester = jiraRequester;
    this.cache = new OrphanDetectorCache();
  }

  private updateProgress(step: string, message: string, progress?: any) {
    if (this.sendProgress) {
      this.sendProgress({
        status: "processing",
        step,
        message,
        progress: progress || {
          currentPhase: step,
          phaseProgress: 0,
          phaseTotal: 1,
          issuesProcessed: 0,
          totalIssues: 0,
          orphansFound: 0,
          linksProcessed: 0,
        },
      });
    }
  }

  // Main method to detect orphans in a workstream
  async detectOrphans(
    workstreamKey: string,
    sendProgress?: (response: OrphanDetectorProgress) => void
  ): Promise<{
    workstream: LiteJiraIssue;
    linkedIssuesWithParents: LiteJiraIssue[];
  }> {
    this.sendProgress = sendProgress;

    try {
      console.log(
        `\n=== Starting Orphan Detection for Workstream ${workstreamKey} ===`
      );

      // Check cache first
      const cachedData = this.cache.getOrphanData(workstreamKey);
      if (cachedData) {
        console.log(`Using cached data for workstream ${workstreamKey}`);
        this.updateProgress(
          "complete",
          `Orphan detection complete (cached data). Workstream data with links and linked issue parent trees retrieved from cache.`,
          {
            currentPhase: "complete",
            phaseProgress: 3,
            phaseTotal: 3,
            issuesProcessed: 0,
            totalIssues: 0,
            orphansFound: 0,
            linksProcessed: 0,
          }
        );
        return cachedData;
      }

      this.updateProgress(
        "initializing",
        `Starting orphan detection for workstream ${workstreamKey}`,
        {
          currentPhase: "initializing",
          phaseProgress: 0,
          phaseTotal: 3,
          issuesProcessed: 0,
          totalIssues: 0,
          orphansFound: 0,
          linksProcessed: 0,
        }
      );

      // Step 1: Get the workstream data using existing JiraReportGraphManager
      const jiraReportGraphManager = new JiraReportGraphManager(
        this.jiraRequester
      );
      const workstreamWithChildren =
        await jiraReportGraphManager.getWorkstreamIssues(workstreamKey);

      this.updateProgress(
        "fetching_linked_issues",
        `Fetching linked issues and building parent trees`,
        {
          currentPhase: "fetching_linked_issues",
          phaseProgress: 1,
          phaseTotal: 3,
          issuesProcessed: 0,
          totalIssues: 0,
          orphansFound: 0,
          linksProcessed: 0,
        }
      );

      // Step 2: Extract all linked issue keys from the workstream
      const linkedIssueKeys = this.extractAllLinkedIssueKeysFromWorkstream(
        workstreamWithChildren
      );
      console.log(`Found ${linkedIssueKeys.length} linked issue keys`);

      // Step 3: Get the linked issues and build their parent trees using batched approach
      const linkedIssuesWithParents =
        await this.buildLinkedIssuesWithParentTreesBatched(linkedIssueKeys);

      this.updateProgress(
        "complete",
        `Orphan detection complete. Workstream data with links and linked issue parent trees fetched.`,
        {
          currentPhase: "complete",
          phaseProgress: 2,
          phaseTotal: 3,
          issuesProcessed: 0,
          totalIssues: 0,
          orphansFound: 0,
          linksProcessed: 0,
        }
      );

      console.log(
        `=== Orphan Detection Complete for Workstream ${workstreamKey} ===\n`
      );

      const result = {
        workstream: workstreamWithChildren,
        linkedIssuesWithParents,
      };

      // Cache the results
      this.cache.setOrphanData(workstreamKey, workstreamWithChildren, linkedIssuesWithParents);
      console.log(`Cached orphan detection results for workstream ${workstreamKey}`);

      return result;
    } catch (error) {
      console.error(
        `Error in orphan detection for workstream ${workstreamKey}:`,
        error
      );

      this.updateProgress(
        "error",
        `Error in orphan detection: ${error.message}`,
        {
          currentPhase: "error",
          phaseProgress: 0,
          phaseTotal: 3,
          issuesProcessed: 0,
          totalIssues: 0,
          orphansFound: 0,
          linksProcessed: 0,
        }
      );

      throw error;
    }
  }

  // Extract all linked issue keys from the workstream recursively
  private extractAllLinkedIssueKeysFromWorkstream(
    workstream: LiteJiraIssue
  ): string[] {
    const linkedKeys = new Set<string>();

    const extractFromIssue = (issue: LiteJiraIssue) => {
      if (issue.links && issue.links.length > 0) {
        for (const link of issue.links) {
          linkedKeys.add(link.linkedIssueKey);
        }
      }

      // Recursively process children
      for (const child of issue.children) {
        extractFromIssue(child);
      }
    };

    extractFromIssue(workstream);

    console.log(
      `Extracted ${linkedKeys.size} unique linked issue keys from workstream`
    );
    console.log("Linked keys:", Array.from(linkedKeys));
    return Array.from(linkedKeys);
  }

  // Build parent trees for linked issues using batched approach
  private async buildLinkedIssuesWithParentTreesBatched(
    linkedIssueKeys: string[]
  ): Promise<LiteJiraIssue[]> {
    if (linkedIssueKeys.length === 0) {
      return [];
    }

    console.log(
      `Building parent trees for ${linkedIssueKeys.length} linked issues using recursive batched approach`
    );

    // Step 1: Get all the linked issues first
    let currentLevelIssues =
      await this.jiraRequester.getIssuesByKeys(linkedIssueKeys);
    console.log(`Level 0: Fetched ${currentLevelIssues.length} linked issues`);

    // Create a map to track all issues by key for easy lookup
    const allIssuesMap = new Map<string, LiteJiraIssue>();
    currentLevelIssues.forEach((issue) => {
      allIssuesMap.set(issue.key, issue);
    });

    let level = 0;
    let hasMoreParents = true;

    while (hasMoreParents) {
      level++;
      console.log(`\n--- Level ${level}: Processing parents ---`);

      // Step 2: Get parent keys for all issues in current level (batched)
      const parentKeys = new Set<string>();
      const parentChildRelationships = await this.getParentKeysForIssues(
        currentLevelIssues.map((issue) => issue.key)
      );

      for (const [issueKey, parentKey] of parentChildRelationships) {
        console.log(`Issue ${issueKey} has parent ${parentKey}`);
        if (parentKey) {
          parentKeys.add(parentKey);
        }
      }

      console.log(`Found ${parentKeys.size} unique parent keys to fetch`);

      if (parentKeys.size === 0) {
        hasMoreParents = false;
        console.log(`No more parents to fetch - stopping at level ${level}`);
        break;
      }

      // Step 3: Fetch all parents for this level
      const parentKeysArray = Array.from(parentKeys);
      const parentIssues =
        await this.jiraRequester.getIssuesByKeys(parentKeysArray);
      console.log(
        `Level ${level}: Fetched ${parentIssues.length} parent issues`
      );

      // Step 4: Add parent issues to our map
      parentIssues.forEach((issue) => {
        allIssuesMap.set(issue.key, issue);
      });

      // Step 5: Update current level issues with their parent references
      for (const issue of currentLevelIssues) {
        const parentKey = parentChildRelationships.get(issue.key);
        if (parentKey && allIssuesMap.has(parentKey)) {
          issue.parent = allIssuesMap.get(parentKey)!;
          console.log(`  ${issue.key} -> parent: ${parentKey}`);
        } else {
          issue.parent = null;
          console.log(`  ${issue.key} -> no parent`);
        }
      }

      // Step 6: Set up for next iteration
      currentLevelIssues = parentIssues;

      // Safety check to prevent infinite loops
      if (level > 10) {
        console.warn(
          `Reached maximum level depth (10), stopping to prevent infinite loop`
        );
        break;
      }
    }

    // Step 7: Return the original linked issues (now with parent trees)
    const linkedIssuesWithParents = linkedIssueKeys
      .map((key) => allIssuesMap.get(key))
      .filter((issue): issue is LiteJiraIssue => issue !== undefined);

    console.log(
      `Completed building parent trees for ${linkedIssuesWithParents.length} issues across ${level} levels`
    );
    return linkedIssuesWithParents;
  }

  // Get parent keys for multiple issues in batches
  private async getParentKeysForIssues(
    issueKeys: string[]
  ): Promise<Map<string, string | null>> {
    const parentChildMap = new Map<string, string | null>();

    if (issueKeys.length === 0) {
      return parentChildMap;
    }

    const batchSize = 50;
    for (let i = 0; i < issueKeys.length; i += batchSize) {
      const batchKeys = issueKeys.slice(i, i + batchSize);

      // Create JQL query for this batch to get parent information
      const keyConditions = batchKeys
        .map((key) => `key = "${key}"`)
        .join(" OR ");
      const jql = `(${keyConditions})`;
      const fields = "key,parent";
      const query = `${jql}&fields=${fields}`;

      try {
        const response = await this.jiraRequester.requestDataFromServer(query);

        for (const issue of response.issues) {
          const parent = issue.fields?.parent;
          const parentKey = parent ? parent.key : null;
          parentChildMap.set(issue.key, parentKey);
        }
      } catch (error) {
        console.error(`Error fetching parent relationships for batch:`, error);
        // Set null for all issues in this batch
        batchKeys.forEach((key) => parentChildMap.set(key, null));
      }
    }

    return parentChildMap;
  }

  // Cache management methods
  clearCache(): void {
    this.cache.clearCache();
  }

  getCacheStats(): { size: number; maxSize: number; duration: number } {
    return this.cache.getCacheStats();
  }

  // Method to invalidate cache for a specific workstream
  invalidateCache(workstreamKey: string): void {
    // The cache will handle this automatically when we try to get expired data
    // But we can also add explicit invalidation if needed
    console.log(`Cache invalidation requested for workstream: ${workstreamKey}`);
  }
}
