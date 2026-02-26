export type GitLabProject = {
  id: number;
  name: string;
  path: string;
  path_with_namespace: string;
  description: string | null;
  visibility: "private" | "internal" | "public";
  web_url: string;
  namespace: {
    id: number;
    name: string;
    path: string;
    kind: "group" | "user";
  };
};

export type GitLabMergeRequest = {
  id: number;
  iid: number;
  project_id: number;
  title: string;
  state: "opened" | "closed" | "locked" | "merged";
  author: {
    id: number;
    name: string;
    username: string;
    avatar_url?: string;
    web_url?: string;
  };
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  merged_at: string | null;
  closed_at: string | null;
  web_url: string;
  [key: string]: any;
};

export type CachedMRData = {
  data: Array<{
    project: GitLabProject;
    mergeRequests: GitLabMergeRequest[];
  }>;
  timestamp: number;
  projectIds: string[];
};

const GITLAB_BASE_URL = "https://gitlab.com/api/v4";

export default class GitLabRequester {
  private mrCache: Map<string, CachedMRData>;

  constructor() {
    this.mrCache = new Map();
  }

  private async fetchRequest(url: string): Promise<any> {
    const apiToken = process.env.GITLAB_API_TOKEN;
    if (!apiToken) {
      throw new Error("GITLAB_API_TOKEN environment variable is not set");
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      let errorBody = "";
      try {
        errorBody = await response.text();
        console.error("GitLab error response body:", errorBody.substring(0, 500));
      } catch (e) {
        console.error("Could not read GitLab error response body:", e);
      }
      throw new Error(
        `Failed to fetch GitLab data: ${url} - Status: ${response.status} ${response.statusText}${errorBody ? ` - Body: ${errorBody.substring(0, 200)}` : ""}`
      );
    }

    return response.json();
  }

  async getProjectsForGroup(groupPath: string): Promise<GitLabProject[]> {
    // URL-encode the group path for use in the API
    const encodedGroup = encodeURIComponent(groupPath);
    const baseUrl = `${GITLAB_BASE_URL}/groups/${encodedGroup}/projects?per_page=100&include_subgroups=true&with_merge_requests_enabled=true`;

    let allProjects: GitLabProject[] = [];
    let page = 1;
    const maxPages = 100;

    while (page <= maxPages) {
      const url = `${baseUrl}&page=${page}`;
      console.log(`Fetching GitLab projects page ${page} from ${url}`);

      const projects: GitLabProject[] = await this.fetchRequest(url);

      if (!Array.isArray(projects) || projects.length === 0) {
        console.log(`No more projects on page ${page}, stopping.`);
        break;
      }

      console.log(`Received ${projects.length} projects on page ${page}`);
      allProjects = allProjects.concat(projects);

      if (projects.length < 100) {
        // Fewer than per_page means this is the last page
        break;
      }

      page++;
    }

    console.log(`Fetched ${allProjects.length} total GitLab projects`);
    return allProjects;
  }

  async getMergeRequestsForProjects(
    projects: GitLabProject[],
    useCache: boolean = true
  ): Promise<
    Array<{
      project: GitLabProject;
      mergeRequests: GitLabMergeRequest[];
    }>
  > {
    const projectIds = projects
      .map((p) => String(p.id))
      .sort()
      .join(",");
    const cacheKey = `mrs_${projectIds}`;

    if (useCache && this.mrCache.has(cacheKey)) {
      const cached = this.mrCache.get(cacheKey)!;
      console.log(
        `Returning cached GitLab MR data (cached at: ${new Date(cached.timestamp).toISOString()})`
      );
      return cached.data;
    }

    const results: Array<{
      project: GitLabProject;
      mergeRequests: GitLabMergeRequest[];
    }> = [];

    for (const project of projects) {
      try {
        const mrs = await this.getMergeRequestsForProject(project);
        results.push({ project, mergeRequests: mrs });
      } catch (error) {
        console.error(
          `Error fetching MRs for project ${project.path_with_namespace}:`,
          error
        );
        results.push({ project, mergeRequests: [] });
      }
    }

    this.mrCache.set(cacheKey, {
      data: results,
      timestamp: Date.now(),
      projectIds: projects.map((p) => String(p.id)),
    });

    return results;
  }

  async getMergeRequestsForProject(
    project: GitLabProject
  ): Promise<GitLabMergeRequest[]> {
    const baseUrl = `${GITLAB_BASE_URL}/projects/${project.id}/merge_requests?state=merged&per_page=100`;

    let allMRs: GitLabMergeRequest[] = [];
    let page = 1;
    const maxPages = 100;

    while (page <= maxPages) {
      const url = `${baseUrl}&page=${page}`;
      console.log(`  Fetching MRs for ${project.path_with_namespace} page ${page}`);

      const mrs: GitLabMergeRequest[] = await this.fetchRequest(url);

      if (!Array.isArray(mrs) || mrs.length === 0) {
        break;
      }

      console.log(`  Page ${page}: Received ${mrs.length} MRs`);
      allMRs = allMRs.concat(mrs);

      if (mrs.length < 100) {
        break;
      }

      page++;
    }

    console.log(
      `  Total MRs for ${project.path_with_namespace}: ${allMRs.length}`
    );
    return allMRs;
  }

  getCachedMRDataTimestamp(projects: GitLabProject[]): number | null {
    const projectIds = projects
      .map((p) => String(p.id))
      .sort()
      .join(",");
    const cacheKey = `mrs_${projectIds}`;
    const cached = this.mrCache.get(cacheKey);
    return cached ? cached.timestamp : null;
  }

  clearMRCache(projects: GitLabProject[]): void {
    const projectIds = projects
      .map((p) => String(p.id))
      .sort()
      .join(",");
    const cacheKey = `mrs_${projectIds}`;
    this.mrCache.delete(cacheKey);
    console.log(`Cleared GitLab MR cache for: ${cacheKey}`);
  }
}
