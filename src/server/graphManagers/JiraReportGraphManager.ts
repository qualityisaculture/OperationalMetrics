import JiraRequester, { LiteJiraIssue } from "../JiraRequester";

// Add SSE response types for progress tracking
export type SSEResponse = {
  status: "processing" | "complete" | "error";
  step?: string;
  message?: string;
  data?: string;
  progress?: {
    currentLevel: number;
    totalLevels: number;
    currentIssues: string[];
    totalIssues: number;
    apiCallsMade: number;
    totalApiCalls: number;
    currentPhase: string;
    phaseProgress: number;
    phaseTotal: number;
  };
};

export interface JiraProject {
  id: string;
  key: string;
  name: string;
}

export interface JiraIssue {
  key: string;
  summary: string;
  type: string;
  status: string;
  children: JiraIssue[];
  childCount: number;
  originalEstimate?: number | null; // in days
  timeSpent?: number | null; // in days
  timeRemaining?: number | null; // in days
}

// Cache for storing project data to avoid repeated API calls
class ProjectCache {
  private projects: Map<
    string,
    { project: JiraProject; issues: JiraIssue[]; lastUpdated: Date }
  > = new Map();
  private readonly CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 1 week

  setProjectData(
    projectKey: string,
    project: JiraProject,
    issues: JiraIssue[]
  ): void {
    this.projects.set(projectKey, {
      project,
      issues,
      lastUpdated: new Date(),
    });
  }

  getProjectData(
    projectKey: string
  ): { project: JiraProject; issues: JiraIssue[] } | null {
    const cached = this.projects.get(projectKey);
    if (!cached) return null;

    const isExpired =
      Date.now() - cached.lastUpdated.getTime() > this.CACHE_DURATION_MS;
    if (isExpired) {
      this.projects.delete(projectKey);
      return null;
    }

    return {
      project: cached.project,
      issues: cached.issues,
    };
  }

  getAllCachedProjects(): JiraProject[] {
    const projects: JiraProject[] = [];
    for (const [_, data] of this.projects) {
      const isExpired =
        Date.now() - data.lastUpdated.getTime() > this.CACHE_DURATION_MS;
      if (!isExpired) {
        projects.push(data.project);
      }
    }
    return projects;
  }

  clearCache(): void {
    this.projects.clear();
  }

  // Find an issue across all cached projects
  findIssueAcrossProjects(
    issueKey: string
  ): { issue: JiraIssue; projectKey: string } | null {
    for (const [projectKey, data] of this.projects) {
      const isExpired =
        Date.now() - data.lastUpdated.getTime() > this.CACHE_DURATION_MS;
      if (isExpired) continue;

      const issue = this.findIssueRecursively(data.issues, issueKey);
      if (issue) {
        return { issue, projectKey };
      }
    }
    return null;
  }

  private findIssueRecursively(
    issues: JiraIssue[],
    targetKey: string
  ): JiraIssue | null {
    for (const issue of issues) {
      if (issue.key === targetKey) {
        return issue;
      }
      // Search in children
      const foundInChildren = this.findIssueRecursively(
        issue.children,
        targetKey
      );
      if (foundInChildren) {
        return foundInChildren;
      }
    }
    return null;
  }
}

// Cache for storing all projects list
class ProjectsListCache {
  private projects: JiraProject[] | null = null;
  private lastUpdated: Date | null = null;
  private readonly CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 1 week

  setProjects(projects: JiraProject[]): void {
    this.projects = projects;
    this.lastUpdated = new Date();
  }

  getProjects(): JiraProject[] | null {
    if (!this.projects || !this.lastUpdated) return null;

    const isExpired =
      Date.now() - this.lastUpdated.getTime() > this.CACHE_DURATION_MS;
    if (isExpired) {
      this.projects = null;
      this.lastUpdated = null;
      return null;
    }

    return this.projects;
  }

  clearCache(): void {
    this.projects = null;
    this.lastUpdated = null;
  }
}

// Cache for storing individual workstream issues with complete tree structure
class WorkstreamCache {
  private workstreams: Map<
    string,
    { workstream: JiraIssue; lastUpdated: Date }
  > = new Map();
  private readonly CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 1 week

  setWorkstream(workstreamKey: string, workstream: JiraIssue): void {
    this.workstreams.set(workstreamKey, {
      workstream,
      lastUpdated: new Date(),
    });
  }

  getWorkstream(workstreamKey: string): JiraIssue | null {
    const cached = this.workstreams.get(workstreamKey);
    if (!cached) {
      const cachedKeys = Array.from(this.workstreams.keys());
      if (cachedKeys.length > 0) {
        console.log(
          `WorkstreamCache miss for key: ${workstreamKey}. Keys in cache: [${cachedKeys.join(
            ", "
          )}]`
        );
      } else {
        console.log(
          `WorkstreamCache miss for key: ${workstreamKey}. Cache is empty.`
        );
      }
      return null;
    }

    const isExpired =
      Date.now() - cached.lastUpdated.getTime() > this.CACHE_DURATION_MS;
    if (isExpired) {
      this.workstreams.delete(workstreamKey);
      return null;
    }

    return cached.workstream;
  }

  clearCache(): void {
    this.workstreams.clear();
  }

  getCacheStatistics(): {
    totalCachedWorkstreams: number;
    cacheHitRate: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
  } {
    const now = Date.now();
    let expiredCount = 0;
    let oldestTime = now;
    let newestTime = 0;

    for (const [_, data] of this.workstreams) {
      const isExpired =
        now - data.lastUpdated.getTime() > this.CACHE_DURATION_MS;
      if (isExpired) {
        expiredCount++;
      }

      const timestamp = data.lastUpdated.getTime();
      if (timestamp < oldestTime) oldestTime = timestamp;
      if (timestamp > newestTime) newestTime = timestamp;
    }

    const validEntries = this.workstreams.size - expiredCount;
    const cacheHitRate =
      this.workstreams.size > 0
        ? (validEntries / this.workstreams.size) * 100
        : 0;

    return {
      totalCachedWorkstreams: this.workstreams.size,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      oldestEntry: oldestTime !== now ? new Date(oldestTime) : null,
      newestEntry: newestTime !== 0 ? new Date(newestTime) : null,
    };
  }
}

export default class JiraReportGraphManager {
  jiraRequester: JiraRequester;
  private projectCache: ProjectCache;
  private projectsListCache: ProjectsListCache;
  private workstreamCache: WorkstreamCache;
  private sendProgress: ((response: SSEResponse) => void) | undefined;
  private lastProgress: any = {
    currentLevel: 0,
    totalLevels: 0,
    currentIssues: [],
    totalIssues: 0,
    apiCallsMade: 0,
    totalApiCalls: 0,
    currentPhase: "",
    phaseProgress: 0,
    phaseTotal: 0,
  };

  constructor(
    jiraRequester: JiraRequester,
    sendProgress?: (response: SSEResponse) => void
  ) {
    this.jiraRequester = jiraRequester;
    this.projectCache = new ProjectCache();
    this.projectsListCache = new ProjectsListCache();
    this.workstreamCache = new WorkstreamCache();
    this.sendProgress = sendProgress;

    // Start cache cleanup interval
    setInterval(() => this.cleanupCache(), this.CACHE_CLEANUP_INTERVAL);
  }

  private updateProgress(step: string, message: string, progress?: any) {
    // Keep track of the last progress data
    if (progress) {
      this.lastProgress = {
        ...this.lastProgress,
        ...progress,
      };
    }

    if (this.sendProgress) {
      this.sendProgress({
        status: "processing",
        step: step as any,
        message,
        progress: this.lastProgress,
      });
    }
  }

  // Clear architecture: Projects → Workstreams → Issues
  async getProjects(): Promise<JiraProject[]> {
    try {
      const cachedProjects = this.projectsListCache.getProjects();
      if (cachedProjects) {
        console.log(`Using cached projects from Jira...`);
        return cachedProjects;
      }

      console.log(`Cache miss for projects, fetching from Jira...`);
      const projects = await this.jiraRequester.getProjects();
      this.projectsListCache.setProjects(projects);
      return projects;
    } catch (error) {
      console.error("Error fetching projects from Jira:", error);
      throw error;
    }
  }

  // Get workstreams for a specific project
  async getProjectWorkstreams(projectKey: string): Promise<JiraIssue[]> {
    try {
      let workstreams: JiraIssue[];
      const cached = this.projectCache.getProjectData(projectKey);

      if (cached) {
        console.log(`Using cached workstreams for project ${projectKey}`);
        workstreams = cached.issues;
      } else {
        console.log(
          `Cache miss for project ${projectKey}, fetching workstreams from Jira...`
        );
        const jql = `project = "${projectKey}" ORDER BY created DESC`;
        workstreams = await this.jiraRequester.getLiteQuery(jql);

        const projects = await this.getProjects();
        const project = projects.find((p) => p.key === projectKey);
        if (project) {
          this.projectCache.setProjectData(projectKey, project, workstreams);
          console.log(
            `Cached workstreams for project ${projectKey} with ${workstreams.length} workstreams`
          );
        }
      }

      // For each workstream, check if a fully cached version is available
      const workstreamsWithData = workstreams.map((workstream) => {
        const cachedWorkstream = this.workstreamCache.getWorkstream(
          workstream.key
        );
        if (cachedWorkstream) {
          console.log(
            `Returning fully cached workstream for ${workstream.key}`
          );
          return cachedWorkstream;
        }
        return workstream;
      });

      return workstreamsWithData;
    } catch (error) {
      console.error(
        `Error fetching workstreams for project ${projectKey}:`,
        error
      );
      throw error;
    }
  }

  // Get all issues for a specific workstream (with complete recursive data)
  async getWorkstreamIssues(
    workstreamKey: string,
    sendProgress?: (response: SSEResponse) => void
  ): Promise<JiraIssue> {
    this.sendProgress = sendProgress;
    try {
      console.log(
        `\n=== Fetching complete issue tree for workstream ${workstreamKey} ===`
      );

      // Send initial progress update
      this.updateProgress(
        "starting",
        `Starting to fetch complete issue tree for workstream ${workstreamKey}`,
        {
          currentLevel: 0,
          totalLevels: 0,
          currentIssues: [],
          totalIssues: 0,
          apiCallsMade: 0,
          totalApiCalls: 0,
          currentPhase: "initializing",
          phaseProgress: 0,
          phaseTotal: 1,
        }
      );

      // First, try to find the workstream in our workstream cache
      const cachedWorkstream =
        this.workstreamCache.getWorkstream(workstreamKey);
      if (cachedWorkstream) {
        console.log(
          `Found complete workstream ${workstreamKey} in cache, returning cached data`
        );

        // Send cache hit progress update
        this.updateProgress(
          "cache_hit",
          `Found workstream ${workstreamKey} in cache, returning cached data`,
          {
            currentPhase: "cache_hit",
            phaseProgress: 1,
            phaseTotal: 1,
          }
        );

        console.log(
          `\n=== RETURNING CACHED WORKSTREAM TREE STRUCTURE FOR ${workstreamKey} ===`
        );
        this.logTreeStructure(cachedWorkstream, 0);
        console.log(`=== END CACHED WORKSTREAM TREE STRUCTURE ===\n`);
        return cachedWorkstream;
      }

      // If not in workstream cache, try to find in project cache
      this.updateProgress(
        "searching_cache",
        `Searching for workstream ${workstreamKey} in project cache...`,
        {
          currentPhase: "searching_cache",
          phaseProgress: 0,
          phaseTotal: 1,
        }
      );

      let issue: JiraIssue;
      let projectKey: string;

      const cachedResult = this.findIssueInCache(workstreamKey);
      if (cachedResult) {
        // Found in project cache
        issue = cachedResult.issue;
        projectKey = cachedResult.projectKey;
        console.log(
          `Found workstream ${workstreamKey} in project ${projectKey} cache, fetching all children recursively...`
        );
      } else {
        // Not found in cache, fetch directly from Jira
        console.log(
          `Workstream ${workstreamKey} not found in cache, fetching directly from Jira...`
        );

        this.updateProgress(
          "fetching_from_jira",
          `Workstream ${workstreamKey} not found in cache, fetching directly from Jira...`,
          {
            currentPhase: "fetching_from_jira",
            phaseProgress: 0,
            phaseTotal: 1,
          }
        );

        // Fetch the workstream directly from Jira
        const workstreamData =
          await this.jiraRequester.getEssentialJiraDataFromKeys([
            workstreamKey,
          ]);
        if (workstreamData.length === 0) {
          throw new Error(`Workstream ${workstreamKey} not found in Jira`);
        }

        const jiraIssue = workstreamData[0];
        issue = {
          key: workstreamKey,
          summary: jiraIssue.fields.summary || `Issue ${workstreamKey}`,
          type: "Workstream", // Assume it's a workstream if we're calling this method
          status: "Unknown",
          children: [],
          childCount: 0,
          originalEstimate: null,
          timeSpent: null,
          timeRemaining: null,
        };
        projectKey = "Unknown"; // We don't know the project for direct fetches
      }

      // Send progress update for starting batched approach
      this.updateProgress(
        "starting_batched",
        `Starting recursive children fetch for workstream ${workstreamKey}...`,
        {
          currentPhase: "fetching_children",
          phaseProgress: 0,
          phaseTotal: 1,
        }
      );

      // Use the batched approach to get all issues recursively
      const workstreamWithAllIssues = await this.getIssueWithAllChildrenBatched(
        issue,
        sendProgress
      );

      // Cache the complete workstream tree
      this.workstreamCache.setWorkstream(
        workstreamKey,
        workstreamWithAllIssues
      );
      console.log(
        `Cached complete workstream tree for ${workstreamKey} with ${workstreamWithAllIssues.children.length} immediate children`
      );

      // Send completion progress update
      this.updateProgress(
        "complete",
        `Completed fetching issue tree for workstream ${workstreamKey}`,
        {
          currentPhase: "complete",
          phaseProgress: 1,
          phaseTotal: 1,
        }
      );

      console.log(
        `=== Completed fetching issue tree for workstream ${workstreamKey} ===\n`
      );
      return workstreamWithAllIssues;
    } catch (error) {
      console.error(
        `Error fetching issues for workstream ${workstreamKey}:`,
        error
      );

      // Send error progress update
      this.updateProgress(
        "error",
        `Error fetching issues for workstream ${workstreamKey}: ${error.message}`,
        {
          currentPhase: "error",
          phaseProgress: 0,
          phaseTotal: 1,
        }
      );

      throw error;
    }
  }

  // Phase 4: Performance optimization and enhanced caching
  private async getIssueWithAllChildrenBatched(
    issue: JiraIssue,
    sendProgress?: (response: SSEResponse) => void
  ): Promise<JiraIssue> {
    this.sendProgress = sendProgress;
    console.log(`\n=== Starting unified fetch for issue ${issue.key} ===`);

    try {
      // Phase 1: Collect all issue data and hierarchy in one go.
      const { allIssues, hierarchy } =
        await this.collectAllIssueDataAndHierarchy(issue, sendProgress);

      // Phase 2: Build the complete tree structure from the collected data.
      const issueWithAllChildren = this.buildTreeFromCollectedData(
        issue.key,
        allIssues,
        hierarchy
      );

      console.log(`=== Completed unified fetch for issue ${issue.key} ===\n`);
      return issueWithAllChildren;
    } catch (error) {
      console.error(`Error in unified fetch for issue ${issue.key}:`, error);
      throw error;
      // Fallback to simple approach if batched approach fails
      // console.log(
      //   `Falling back to simple children fetch for issue ${issue.key}`
      // );
      // return await this.getIssueWithSimpleChildren(issue);
    }
  }

  // Fallback method for simple children fetching
  private async getIssueWithSimpleChildren(
    issue: JiraIssue
  ): Promise<JiraIssue> {
    try {
      const children = await this.jiraRequester.getChildrenForIssue(issue.key);

      const childrenWithDetails = children.map((child) => ({
        key: child.key,
        summary: child.summary,
        type: child.type,
        status: child.status,
        children: [],
        childCount: 0,
        originalEstimate: child.originalEstimate || null,
        timeSpent: child.timeSpent || null,
        timeRemaining: child.timeRemaining || null,
      }));

      return {
        ...issue,
        children: childrenWithDetails,
        childCount: childrenWithDetails.length,
      };
    } catch (error) {
      console.error(
        `Error in simple children fetch for issue ${issue.key}:`,
        error
      );
      return {
        ...issue,
        children: [],
        childCount: 0,
      };
    }
  }

  // Enhanced caching with TTL and size limits
  private readonly MAX_CACHE_SIZE = 1000; // Maximum number of cached projects
  private readonly CACHE_CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes

  private cleanupCache(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [projectKey, data] of this.projectCache["projects"]) {
      const isExpired =
        now - data.lastUpdated.getTime() >
        this.projectCache["CACHE_DURATION_MS"];
      if (isExpired) {
        this.projectCache["projects"].delete(projectKey);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired cache entries`);
    }

    // If cache is still too large, remove oldest entries
    if (this.projectCache["projects"].size > this.MAX_CACHE_SIZE) {
      const entries = Array.from(this.projectCache["projects"].entries());
      entries.sort(
        (a, b) => a[1].lastUpdated.getTime() - b[1].lastUpdated.getTime()
      );

      const toRemove = entries.slice(
        0,
        this.projectCache["projects"].size - this.MAX_CACHE_SIZE
      );
      for (const [projectKey] of toRemove) {
        this.projectCache["projects"].delete(projectKey);
      }

      console.log(
        `Removed ${toRemove.length} oldest cache entries to maintain size limit`
      );
    }
  }

  // Enhanced project issues loading with cache optimization
  async getProjectIssues(projectKey: string): Promise<JiraIssue[]> {
    try {
      // Clean up cache periodically
      this.cleanupCache();

      // Check cache first
      const cached = this.projectCache.getProjectData(projectKey);
      if (cached) {
        console.log(`Using cached data for project ${projectKey}`);
        return cached.issues;
      }

      console.log(
        `Cache miss for project ${projectKey}, fetching from Jira...`
      );

      // Create a minimal JQL query to get issues for the specific project
      const jql = `project = "${projectKey}" ORDER BY created DESC`;

      // Use the new lite query method to get minimal data
      const issues = await this.jiraRequester.getLiteQuery(jql);

      // Cache the results
      const projects = await this.getProjects();
      const project = projects.find((p) => p.key === projectKey);
      if (project) {
        this.projectCache.setProjectData(projectKey, project, issues);
        console.log(
          `Cached data for project ${projectKey} with ${issues.length} issues`
        );
      }

      return issues;
    } catch (error) {
      console.error(`Error fetching issues for project ${projectKey}:`, error);
      throw error;
    }
  }

  // New method to get cached project data if available
  getCachedProjectIssues(projectKey: string): JiraIssue[] | null {
    const cached = this.projectCache.getProjectData(projectKey);
    return cached ? cached.issues : null;
  }

  // New method to find an issue across all cached projects
  findIssueInCache(
    issueKey: string
  ): { issue: JiraIssue; projectKey: string } | null {
    return this.projectCache.findIssueAcrossProjects(issueKey);
  }

  // New method to clear cache (useful for testing or manual refresh)
  clearCache(): void {
    this.projectCache.clearCache();
    this.projectsListCache.clearCache();
    this.workstreamCache.clearCache();
  }

  // New method to clear specific caches
  clearProjectCache(): void {
    this.projectCache.clearCache();
  }

  clearProjectsListCache(): void {
    this.projectsListCache.clearCache();
  }

  clearWorkstreamCache(): void {
    console.log("Clearing workstream cache");
    this.workstreamCache.clearCache();
  }

  // New method to get workstream cache statistics
  getWorkstreamCacheStatistics(): {
    totalCachedWorkstreams: number;
    cacheHitRate: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
  } {
    return this.workstreamCache.getCacheStatistics();
  }

  // Final enhancement: Get detailed statistics about the recursive fetching process
  getCacheStatistics(): {
    totalCachedProjects: number;
    cacheHitRate: number;
    totalCacheSize: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
    projectsListCache: {
      hasCachedProjects: boolean;
      lastUpdated: Date | null;
    };
    workstreamCache: {
      totalCachedWorkstreams: number;
      cacheHitRate: number;
      oldestEntry: Date | null;
      newestEntry: Date | null;
    };
  } {
    const projects = this.projectCache["projects"];
    const now = Date.now();

    if (projects.size === 0) {
      return {
        totalCachedProjects: 0,
        cacheHitRate: 0,
        totalCacheSize: 0,
        oldestEntry: null,
        newestEntry: null,
        projectsListCache: {
          hasCachedProjects: this.projectsListCache.getProjects() !== null,
          lastUpdated: null,
        },
        workstreamCache: this.workstreamCache.getCacheStatistics(),
      };
    }

    let expiredCount = 0;
    let oldestTime = now;
    let newestTime = 0;

    for (const [_, data] of projects) {
      const isExpired =
        now - data.lastUpdated.getTime() >
        this.projectCache["CACHE_DURATION_MS"];
      if (isExpired) {
        expiredCount++;
      }

      const timestamp = data.lastUpdated.getTime();
      if (timestamp < oldestTime) oldestTime = timestamp;
      if (timestamp > newestTime) newestTime = timestamp;
    }

    const validEntries = projects.size - expiredCount;
    const cacheHitRate =
      projects.size > 0 ? (validEntries / projects.size) * 100 : 0;

    // Get projects list cache info
    const cachedProjects = this.projectsListCache.getProjects();
    const projectsListCacheInfo = {
      hasCachedProjects: cachedProjects !== null,
      lastUpdated: null as Date | null,
    };

    // Get workstream cache statistics
    const workstreamCacheStats = this.workstreamCache.getCacheStatistics();

    return {
      totalCachedProjects: projects.size,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      totalCacheSize: projects.size,
      oldestEntry: oldestTime !== now ? new Date(oldestTime) : null,
      newestEntry: newestTime !== 0 ? new Date(newestTime) : null,
      projectsListCache: projectsListCacheInfo,
      workstreamCache: workstreamCacheStats,
    };
  }

  // Phase 2: Recursive issue discovery
  async getIssueWithAllChildren(
    issueKey: string,
    sendProgress?: (response: SSEResponse) => void
  ): Promise<JiraIssue> {
    this.sendProgress = sendProgress;
    try {
      // Try to find the issue in our project cache
      const cachedResult = this.findIssueInCache(issueKey);
      if (!cachedResult) {
        throw new Error(
          `Issue ${issueKey} not found in any cached project. Please load the project first.`
        );
      }

      const { issue, projectKey } = cachedResult;
      console.log(
        `Found issue ${issueKey} in project ${projectKey}, checking if complete tree is already cached...`
      );

      // Check if we already have the complete tree structure in cache
      const completeTreeFromCache = this.findCompleteTreeInCache(issueKey);
      if (completeTreeFromCache) {
        console.log(
          `Complete tree for issue ${issueKey} found in cache, returning cached data`
        );
        console.log(
          `\n=== RETURNING CACHED TREE STRUCTURE FOR ${issueKey} ===`
        );
        this.logTreeStructure(completeTreeFromCache, 0);
        console.log(`=== END CACHED TREE STRUCTURE ===\n`);
        return completeTreeFromCache;
      }

      console.log(
        `Complete tree for issue ${issueKey} not in cache, fetching recursively...`
      );

      // Use the batched approach to fetch all children
      const issueWithAllChildren = await this.getIssueWithAllChildrenBatched(
        issue,
        sendProgress
      );

      console.log(`\n=== RETURNING FETCHED TREE STRUCTURE FOR ${issueKey} ===`);
      this.logTreeStructure(issueWithAllChildren, 0);
      console.log(`=== END FETCHED TREE STRUCTURE ===\n`);

      return issueWithAllChildren;
    } catch (error) {
      console.error(
        `Error getting issue ${issueKey} with all children:`,
        error
      );
      throw error;
    }
  }

  // Helper method to log tree structure recursively
  private logTreeStructure(issue: JiraIssue, depth: number): void {
    const indent = "  ".repeat(depth);
    console.log(
      `${indent}📋 ${issue.key} - ${issue.summary} (${issue.type}) - ${issue.children.length} children`
    );

    if (issue.children && issue.children.length > 0) {
      for (const child of issue.children) {
        this.logTreeStructure(child, depth + 1);
      }
    }
  }

  // New method to find complete tree structure in cache
  private findCompleteTreeInCache(issueKey: string): JiraIssue | null {
    console.log(
      `\n=== Searching for complete tree of issue ${issueKey} in cache ===`
    );

    // Search through all cached projects
    for (const [projectKey, data] of this.projectCache["projects"]) {
      const isExpired =
        Date.now() - data.lastUpdated.getTime() >
        this.projectCache["CACHE_DURATION_MS"];
      if (isExpired) {
        console.log(`Skipping expired project ${projectKey}`);
        continue;
      }

      console.log(
        `Checking project ${projectKey} with ${data.issues.length} top-level issues`
      );

      // Collect all issues in this project's tree recursively
      const allIssuesInTree = this.collectAllIssuesInTree(data.issues);
      console.log(
        `Project ${projectKey} contains ${allIssuesInTree.size} total issues in tree`
      );

      // Check if our target issue is in this tree
      if (allIssuesInTree.has(issueKey)) {
        const cachedIssue = allIssuesInTree.get(issueKey)!;
        console.log(`Found issue ${issueKey} in project ${projectKey} cache`);
        console.log(
          `Issue ${issueKey} has ${cachedIssue.children.length} children`
        );

        // Check if this issue has a complete tree (children with their own children)
        if (this.hasCompleteTreeStructure(cachedIssue)) {
          console.log(`Issue ${issueKey} has complete tree structure in cache`);
          return cachedIssue;
        } else {
          console.log(
            `Issue ${issueKey} found but only has immediate children, not complete tree`
          );
        }
      } else {
        console.log(`Issue ${issueKey} not found in project ${projectKey}`);
      }
    }

    console.log(
      `=== Complete tree for issue ${issueKey} not found in any cached project ===`
    );
    return null;
  }

  // Collect all issues in a tree recursively into a Map
  private collectAllIssuesInTree(issues: JiraIssue[]): Map<string, JiraIssue> {
    const allIssues = new Map<string, JiraIssue>();

    const collectRecursively = (issueList: JiraIssue[]) => {
      for (const issue of issueList) {
        allIssues.set(issue.key, issue);
        if (issue.children && issue.children.length > 0) {
          collectRecursively(issue.children);
        }
      }
    };

    collectRecursively(issues);
    return allIssues;
  }

  // Check if an issue has a complete tree structure (children with their own children)
  private hasCompleteTreeStructure(issue: JiraIssue): boolean {
    if (!issue.children || issue.children.length === 0) {
      return true; // Leaf node, considered complete
    }

    // Check if any child has children (indicating we have a complete tree)
    for (const child of issue.children) {
      if (child.children && child.children.length > 0) {
        return true; // Found a child with children, so this is a complete tree
      }
    }

    // All children are leaf nodes, which means this is just immediate children
    return false;
  }

  // Phase 1: Unified recursive issue discovery and data fetching
  private async collectAllIssueDataAndHierarchy(
    rootIssue: JiraIssue,
    sendProgress?: (response: SSEResponse) => void
  ): Promise<{
    allIssues: Map<string, JiraIssue>;
    hierarchy: Map<string, string[]>;
  }> {
    this.sendProgress = sendProgress;
    const allIssues = new Map<string, JiraIssue>();
    const hierarchy = new Map<string, string[]>();
    let currentLevelKeys = [rootIssue.key];
    let levelNumber = 0;
    let totalApiCalls = 0;

    // The root issue is already passed in with full details
    allIssues.set(rootIssue.key, rootIssue);

    console.log(`\n--- Starting level-by-level collection ---`);
    console.log(
      `Level ${levelNumber}: Root issues: ${currentLevelKeys.join(", ")}`
    );

    // Send initial progress update for level collection
    this.updateProgress(
      "level_collection_start",
      "Starting level-by-level collection of all issues",
      {
        currentLevel: levelNumber,
        totalLevels: 0, // We don't know yet
        currentIssues: currentLevelKeys,
        totalIssues: currentLevelKeys.length,
        apiCallsMade: 0,
        totalApiCalls: 0,
        currentPhase: "level_collection",
        phaseProgress: 0,
        phaseTotal: 1,
      }
    );

    while (currentLevelKeys.length > 0) {
      levelNumber++;
      console.log(`\n--- Processing Level ${levelNumber} ---`);
      console.log(
        `Level ${levelNumber}: Fetching children for ${currentLevelKeys.length} issues: ${currentLevelKeys.join(", ")}`
      );

      // Send progress update for current level
      this.updateProgress(
        "processing_level",
        `Processing Level ${levelNumber}: Fetching children for ${currentLevelKeys.length} issues`,
        {
          currentLevel: levelNumber,
          currentIssues: currentLevelKeys,
          totalIssues: currentLevelKeys.length,
          apiCallsMade: totalApiCalls,
          currentPhase: "level_collection",
          phaseProgress: levelNumber,
          phaseTotal: levelNumber + 1, // Estimate
        }
      );

      // Make a single batch API call for all issues at this level
      // This call now fetches all required fields, not just keys.
      const batchStartTime = Date.now();
      const childrenData =
        await this.jiraRequester.getAllChildrenForIssues(currentLevelKeys);
      const batchEndTime = Date.now();
      totalApiCalls++;

      console.log(
        `Level ${levelNumber}: Batch API call completed in ${batchEndTime - batchStartTime}ms`
      );
      console.log(
        `Level ${levelNumber}: Found ${childrenData.length} total children`
      );

      // Send progress update for API call completion
      this.updateProgress(
        "api_call_complete",
        `Level ${levelNumber}: Batch API call completed, found ${childrenData.length} children`,
        {
          apiCallsMade: totalApiCalls,
          currentPhase: "level_collection",
          phaseProgress: levelNumber,
          phaseTotal: levelNumber + 1,
        }
      );

      // Group children by their parent
      const childrenByParent = new Map<string, string[]>();
      const nextLevelKeys: string[] = [];

      for (const child of childrenData) {
        const parentKey = child.parentKey;
        if (!parentKey) continue; // Should not happen in this context

        if (!childrenByParent.has(parentKey)) {
          childrenByParent.set(parentKey, []);
        }
        childrenByParent.get(parentKey)!.push(child.key);
        nextLevelKeys.push(child.key);

        // Store the full child issue details
        if (!allIssues.has(child.key)) {
          allIssues.set(child.key, {
            ...child,
            children: [],
            childCount: 0,
          });
        }
      }

      // Store this level's data
      for (const [parentKey, childKeys] of childrenByParent) {
        hierarchy.set(parentKey, childKeys);
        console.log(
          `Level ${levelNumber}: ${parentKey} has ${childKeys.length} children: ${childKeys.join(", ")}`
        );
      }

      console.log(
        `Level ${levelNumber}: Next level will have ${nextLevelKeys.length} issues to process`
      );

      // Send progress update for level completion
      this.updateProgress(
        "level_complete",
        `Level ${levelNumber} completed, next level will have ${nextLevelKeys.length} issues`,
        {
          currentLevel: levelNumber,
          currentIssues: nextLevelKeys,
          totalIssues: nextLevelKeys.length,
          apiCallsMade: totalApiCalls,
          currentPhase: "level_collection",
          phaseProgress: levelNumber,
          phaseTotal: levelNumber + 1,
        }
      );

      // Prepare for next level
      currentLevelKeys = nextLevelKeys;

      // Safety check to prevent infinite loops
      if (levelNumber > 10) {
        console.warn(
          `Reached maximum level depth (10), stopping to prevent infinite loop`
        );
        break;
      }
    }

    console.log(`\n--- Level-by-level collection completed ---`);
    console.log(`Total API calls made: ${totalApiCalls}`);
    console.log(`Total levels processed: ${levelNumber}`);
    console.log(`Total parent-child relationships found: ${hierarchy.size}`);

    // Send final progress update for level collection
    this.updateProgress(
      "level_collection_complete",
      `Level-by-level collection completed: ${totalApiCalls} API calls, ${levelNumber} levels, ${hierarchy.size} relationships`,
      {
        currentLevel: levelNumber,
        totalLevels: levelNumber,
        currentIssues: [],
        totalIssues: 0,
        apiCallsMade: totalApiCalls,
        totalApiCalls: totalApiCalls,
        currentPhase: "level_collection_complete",
        phaseProgress: 1,
        phaseTotal: 1,
      }
    );

    return { allIssues, hierarchy };
  }

  // Phase 2: Simplified tree building from pre-fetched data
  private buildTreeFromCollectedData(
    rootIssueKey: string,
    allIssues: Map<string, JiraIssue>,
    hierarchy: Map<string, string[]>
  ): JiraIssue {
    const buildRecursively = (issueKey: string): JiraIssue => {
      const issueData = allIssues.get(issueKey);
      if (!issueData) {
        // This should not happen if data collection was successful
        console.error(`Data for issue ${issueKey} was not collected.`);
        throw `Data for issue ${issueKey} was not collected`;
      }

      const childKeys = hierarchy.get(issueKey) || [];
      const children = childKeys.map((key) => buildRecursively(key));

      // Return a copy of the issue data with the children populated
      return {
        ...issueData,
        children,
        childCount: children.length,
      };
    };

    console.log(`\n--- Building tree structure for issue ${rootIssueKey} ---`);
    const fullTree = buildRecursively(rootIssueKey);
    console.log(`--- Tree structure completed for issue ${rootIssueKey} ---`);
    return fullTree;
  }

  // Helper method to get a specific level of children for an issue
  async getIssueChildren(issueKey: string): Promise<JiraIssue[]> {
    try {
      // First, try to find the issue in our cache
      const cachedResult = this.findIssueInCache(issueKey);
      if (!cachedResult) {
        throw new Error(
          `Issue ${issueKey} not found in any cached project. Please load the project first.`
        );
      }

      // Fetch immediate children for this issue
      const children = await this.jiraRequester.getChildrenForIssue(issueKey);

      // Convert to JiraIssue format
      return children.map((child) => ({
        key: child.key,
        summary: child.summary,
        type: child.type,
        status: child.status,
        children: [], // We don't fetch nested children here
        childCount: 0, // We don't know the child count without fetching
        originalEstimate: child.originalEstimate || null,
        timeSpent: child.timeSpent || null,
        timeRemaining: child.timeRemaining || null,
      }));
    } catch (error) {
      console.error(`Error getting children for issue ${issueKey}:`, error);
      throw error;
    }
  }
}
