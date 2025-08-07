import JiraRequester, { LiteJiraIssue } from "../JiraRequester";

export interface JiraProject {
  id: string;
  key: string;
  name: string;
}

export interface JiraIssue {
  key: string;
  summary: string;
  type: string;
  children: JiraIssue[];
  childCount: number;
}

// Cache for storing project data to avoid repeated API calls
class ProjectCache {
  private projects: Map<
    string,
    { project: JiraProject; issues: JiraIssue[]; lastUpdated: Date }
  > = new Map();
  private readonly CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

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

export default class JiraReportGraphManager {
  jiraRequester: JiraRequester;
  private projectCache: ProjectCache;

  constructor(jiraRequester: JiraRequester) {
    this.jiraRequester = jiraRequester;
    this.projectCache = new ProjectCache();
  }

  // Clear architecture: Projects → Workstreams → Issues
  async getProjects(): Promise<JiraProject[]> {
    try {
      const projects = await this.jiraRequester.getProjects();
      return projects;
    } catch (error) {
      console.error("Error fetching projects from Jira:", error);
      throw error;
    }
  }

  // Get workstreams for a specific project
  async getProjectWorkstreams(projectKey: string): Promise<JiraIssue[]> {
    try {
      // Check cache first
      const cached = this.projectCache.getProjectData(projectKey);
      if (cached) {
        console.log(`Using cached workstreams for project ${projectKey}`);
        return cached.issues;
      }

      console.log(
        `Cache miss for project ${projectKey}, fetching workstreams from Jira...`
      );

      // Use the original JQL query that was working - get all issues for the project
      const jql = `project = "${projectKey}" ORDER BY created DESC`;

      // Use the lite query method to get workstream data
      const workstreams = await this.jiraRequester.getLiteQuery(jql);

      // Cache the results
      const projects = await this.getProjects();
      const project = projects.find((p) => p.key === projectKey);
      if (project) {
        this.projectCache.setProjectData(projectKey, project, workstreams);
        console.log(
          `Cached workstreams for project ${projectKey} with ${workstreams.length} workstreams`
        );
      }

      return workstreams;
    } catch (error) {
      console.error(
        `Error fetching workstreams for project ${projectKey}:`,
        error
      );
      throw error;
    }
  }

  // Get all issues for a specific workstream (with complete recursive data)
  async getWorkstreamIssues(workstreamKey: string): Promise<JiraIssue> {
    try {
      console.log(
        `\n=== Fetching complete issue tree for workstream ${workstreamKey} ===`
      );

      // First, try to find the workstream in our cache
      const cachedResult = this.findIssueInCache(workstreamKey);
      if (!cachedResult) {
        throw new Error(
          `Workstream ${workstreamKey} not found in any cached project. Please load the project first.`
        );
      }

      const { issue, projectKey } = cachedResult;
      console.log(
        `Found workstream ${workstreamKey} in project ${projectKey}, fetching all children recursively...`
      );

      // Use the batched approach to get all issues recursively
      const workstreamWithAllIssues =
        await this.getIssueWithAllChildrenBatched(issue);

      console.log(
        `=== Completed fetching issue tree for workstream ${workstreamKey} ===\n`
      );
      return workstreamWithAllIssues;
    } catch (error) {
      console.error(
        `Error fetching issues for workstream ${workstreamKey}:`,
        error
      );
      throw error;
    }
  }

  // Phase 4: Performance optimization and enhanced caching
  private async getIssueWithAllChildrenBatched(
    issue: JiraIssue
  ): Promise<JiraIssue> {
    console.log(
      `\n=== Starting batched children fetch for issue ${issue.key} ===`
    );

    // If the issue has no children, return it as is
    if (issue.childCount === 0) {
      console.log(`Issue ${issue.key} has no children, returning as leaf node`);
      return issue;
    }

    try {
      // Phase 1: Collect all issue keys at each level
      const allLevelsData = await this.collectAllLevelsBatched([issue.key]);

      // Phase 2: Build the complete tree structure
      const issueWithAllChildren = await this.buildTreeFromBatchedData(
        issue,
        allLevelsData
      );

      console.log(
        `=== Completed batched children fetch for issue ${issue.key} ===\n`
      );
      return issueWithAllChildren;
    } catch (error) {
      console.error(
        `Error in batched children fetch for issue ${issue.key}:`,
        error
      );

      // Fallback to simple approach if batched approach fails
      console.log(
        `Falling back to simple children fetch for issue ${issue.key}`
      );
      return await this.getIssueWithSimpleChildren(issue);
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
        children: [],
        childCount: 0,
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
  }

  // Final enhancement: Get detailed statistics about the recursive fetching process
  getCacheStatistics(): {
    totalCachedProjects: number;
    cacheHitRate: number;
    totalCacheSize: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
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

    return {
      totalCachedProjects: projects.size,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      totalCacheSize: projects.size,
      oldestEntry: oldestTime !== now ? new Date(oldestTime) : null,
      newestEntry: newestTime !== 0 ? new Date(newestTime) : null,
    };
  }

  // Phase 2: Recursive issue discovery
  async getIssueWithAllChildren(issueKey: string): Promise<JiraIssue> {
    try {
      // First, try to find the issue in our cache
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

      // Use the new batched approach instead of individual calls
      const issueWithAllChildren =
        await this.getIssueWithAllChildrenBatched(issue);

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

  // Phase 1: Batched recursive issue discovery
  private async collectAllLevelsBatched(
    rootIssueKeys: string[]
  ): Promise<Map<string, string[]>> {
    const allLevelsData = new Map<string, string[]>(); // parentKey -> childKeys[]
    let currentLevelKeys = rootIssueKeys;
    let levelNumber = 0;
    let totalApiCalls = 0;

    console.log(`\n--- Starting level-by-level collection ---`);
    console.log(
      `Level ${levelNumber}: Root issues: ${currentLevelKeys.join(", ")}`
    );

    while (currentLevelKeys.length > 0) {
      levelNumber++;
      console.log(`\n--- Processing Level ${levelNumber} ---`);
      console.log(
        `Level ${levelNumber}: Fetching children for ${currentLevelKeys.length} issues: ${currentLevelKeys.join(", ")}`
      );

      // Make a single batch API call for all issues at this level
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

      // Group children by their parent
      const childrenByParent = new Map<string, string[]>();
      const nextLevelKeys: string[] = [];

      for (const child of childrenData) {
        const parentKey = child.parentKey;
        if (!childrenByParent.has(parentKey)) {
          childrenByParent.set(parentKey, []);
        }
        childrenByParent.get(parentKey)!.push(child.key);
        nextLevelKeys.push(child.key);
      }

      // Store this level's data
      for (const [parentKey, childKeys] of childrenByParent) {
        allLevelsData.set(parentKey, childKeys);
        console.log(
          `Level ${levelNumber}: ${parentKey} has ${childKeys.length} children: ${childKeys.join(", ")}`
        );
      }

      console.log(
        `Level ${levelNumber}: Next level will have ${nextLevelKeys.length} issues to process`
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
    console.log(
      `Total parent-child relationships found: ${allLevelsData.size}`
    );

    return allLevelsData;
  }

  // Phase 2: Enhanced tree building with issue details
  private async buildTreeFromBatchedData(
    issue: JiraIssue,
    allLevelsData: Map<string, string[]>
  ): Promise<JiraIssue> {
    console.log(`\n--- Building tree structure for issue ${issue.key} ---`);

    // Collect all issue keys that we need details for
    const allIssueKeys = new Set<string>();
    allIssueKeys.add(issue.key);

    for (const [parentKey, childKeys] of allLevelsData) {
      allIssueKeys.add(parentKey);
      childKeys.forEach((key) => allIssueKeys.add(key));
    }

    console.log(`Need details for ${allIssueKeys.size} total issues`);

    // Get details for all issues not in cache
    const missingKeys = Array.from(allIssueKeys).filter(
      (key) => !this.findIssueInCache(key)
    );
    const issueDetails = await this.getIssueDetailsWithTypes(missingKeys);

    console.log(`Fetched details for ${issueDetails.size} missing issues`);

    // Recursively build the tree using the batched data and issue details
    const issueWithChildren = await this.buildTreeRecursivelyWithDetails(
      issue.key,
      allLevelsData,
      issueDetails
    );

    console.log(`--- Tree structure completed for issue ${issue.key} ---`);
    return issueWithChildren;
  }

  private async buildTreeRecursivelyWithDetails(
    issueKey: string,
    allLevelsData: Map<string, string[]>,
    issueDetails: Map<string, { summary: string; type: string }>
  ): Promise<JiraIssue> {
    const childKeys = allLevelsData.get(issueKey) || [];

    // Get issue details from cache or fetched details
    const cachedResult = this.findIssueInCache(issueKey);
    const fetchedDetails = issueDetails.get(issueKey);

    let issueSummary: string;
    let issueType: string;

    if (cachedResult) {
      issueSummary = cachedResult.issue.summary;
      issueType = cachedResult.issue.type;
    } else if (fetchedDetails) {
      issueSummary = fetchedDetails.summary;
      issueType = fetchedDetails.type;
    } else {
      issueSummary = `Issue ${issueKey}`;
      issueType = "Unknown";
    }

    if (childKeys.length === 0) {
      // This is a leaf node
      return {
        key: issueKey,
        summary: issueSummary,
        type: issueType,
        children: [],
        childCount: 0,
      };
    }

    // This issue has children - recursively build the tree
    const children = await Promise.all(
      childKeys.map((childKey) =>
        this.buildTreeRecursivelyWithDetails(
          childKey,
          allLevelsData,
          issueDetails
        )
      )
    );

    return {
      key: issueKey,
      summary: issueSummary,
      type: issueType,
      children: children,
      childCount: children.length,
    };
  }

  // Helper method to get issue details for children not in cache
  private async getIssueDetailsForKeys(
    issueKeys: string[]
  ): Promise<Map<string, { summary: string; type: string }>> {
    if (issueKeys.length === 0) {
      return new Map();
    }

    try {
      console.log(
        `Fetching details for ${issueKeys.length} issues not in cache: ${issueKeys.join(", ")}`
      );

      // Use the existing method to get essential data for these keys
      const essentialData =
        await this.jiraRequester.getEssentialJiraDataFromKeys(issueKeys);

      const issueDetails = new Map<string, { summary: string; type: string }>();
      for (const issue of essentialData) {
        issueDetails.set(issue.key, {
          summary: issue.fields.summary || `Issue ${issue.key}`,
          type: "Unknown", // We don't have issue type in essential data, but we can get it from the original children data
        });
      }

      return issueDetails;
    } catch (error) {
      console.warn(
        `Could not fetch details for issues: ${issueKeys.join(", ")}`,
        error
      );
      return new Map();
    }
  }

  // Phase 3: Enhanced issue details with proper type information
  private async getIssueDetailsWithTypes(
    issueKeys: string[]
  ): Promise<Map<string, { summary: string; type: string }>> {
    if (issueKeys.length === 0) {
      return new Map();
    }

    try {
      console.log(
        `Fetching detailed info for ${issueKeys.length} issues: ${issueKeys.join(", ")}`
      );

      // Create a JQL query to get issue details including type
      const jql = issueKeys.map((key) => `key = "${key}"`).join(" OR ");
      const domain = process.env.JIRA_DOMAIN;
      const url = `${domain}/rest/api/3/search?jql=${jql}&fields=key,summary,issuetype`;

      const response = await this.jiraRequester.fetchRequest(url);

      const issueDetails = new Map<string, { summary: string; type: string }>();
      for (const issue of response.issues) {
        issueDetails.set(issue.key, {
          summary: issue.fields.summary || `Issue ${issue.key}`,
          type: issue.fields.issuetype?.name || "Unknown",
        });
      }

      console.log(
        `Successfully fetched details for ${issueDetails.size} issues`
      );
      return issueDetails;
    } catch (error) {
      console.warn(
        `Could not fetch detailed info for issues: ${issueKeys.join(", ")}`,
        error
      );
      // Fallback to essential data
      return this.getIssueDetailsForKeys(issueKeys);
    }
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
        children: [], // We don't fetch nested children here
        childCount: 0, // We don't know the child count without fetching
      }));
    } catch (error) {
      console.error(`Error getting children for issue ${issueKey}:`, error);
      throw error;
    }
  }
}
