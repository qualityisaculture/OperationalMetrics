export type BitBucketRepository = {
  uuid?: string;
  full_name: string;
  name: string;
  slug: string;
  description: string | null;
  is_private: boolean;
  created_on: string;
  updated_on: string;
  links?: {
    html?: {
      href: string;
    };
    self?: {
      href: string;
    };
  };
  // Additional fields that might come from API 1.0
  [key: string]: any;
};

export type BitBucketRepositoriesResponse = {
  size?: number;
  page?: number;
  pagelen?: number;
  next?: string | null;
  previous?: string | null;
  values?: BitBucketRepository[];
  // API 1.0 might return repositories directly or in a different structure
  repositories?: BitBucketRepository[];
  // API 1.0 pagination
  isLastPage?: boolean;
  nextPageStart?: number;
  [key: string]: any;
};

export type BitBucketPullRequest = {
  id: number;
  title: string;
  state: "OPEN" | "MERGED" | "DECLINED" | "SUPERSEDED";
  author: {
    display_name?: string;
    user?: {
      displayName: string;
      name?: string;
    };
    uuid?: string;
    account_id?: string;
  };
  created_on?: string; // API 2.0 format
  createdDate?: number; // API 1.0 format (timestamp in milliseconds)
  updated_on?: string; // API 2.0 format
  updatedDate?: number; // API 1.0 format (timestamp in milliseconds)
  merged?: boolean;
  open?: boolean; // API 1.0 format
  closed?: boolean; // API 1.0 format
  links?: {
    html?: {
      href: string;
    };
    self?: Array<{
      href: string;
    }>;
  };
  // Additional fields that might come from API 1.0
  [key: string]: any;
};

export type BitBucketPullRequestsResponse = {
  size?: number;
  page?: number;
  pagelen?: number;
  limit?: number;
  next?: string | null;
  previous?: string | null;
  isLastPage?: boolean;
  nextPageStart?: number;
  values?: BitBucketPullRequest[];
  // API 1.0 might return pull requests directly
  [key: string]: any;
};

export type CachedPRData = {
  data: Array<{
    repository: BitBucketRepository;
    pullRequests: BitBucketPullRequest[];
  }>;
  timestamp: number;
  repositoryIds: string[];
};

export default class BitBucketRequester {
  private prCache: Map<string, CachedPRData>;

  constructor() {
    this.prCache = new Map();
  }

  async getAllRepositories(workspace?: string): Promise<BitBucketRepository[]> {
    const domain = process.env.BITBUCKET_DOMAIN;
    if (!domain) {
      throw new Error("BITBUCKET_DOMAIN environment variable is not set");
    }

    // Detect if this is BitBucket Server (self-hosted) or BitBucket Cloud
    // BitBucket Cloud uses api.bitbucket.org, BitBucket Server uses custom domains
    const isBitBucketServer = !domain.includes("api.bitbucket.org");

    // Build the URL - if domain already includes the full path, use it as-is
    // Otherwise, construct the path based on whether workspace is provided
    let baseUrl: string;
    if (workspace) {
      // BitBucket Cloud format: /2.0/repositories/{workspace}
      baseUrl = `${domain}/2.0/repositories/${workspace}?pagelen=100`;
    } else if (
      domain.includes("/2.0/repositories") ||
      domain.includes("/rest/api")
    ) {
      // Domain already includes the full path
      baseUrl = `${domain}${domain.includes("?") ? "&" : "?"}pagelen=100`;
    } else if (isBitBucketServer) {
      // BitBucket Server format: /rest/api/1.0/repos (API 1.0) or /rest/api/2.0/repositories (API 2.0)
      // Try API 2.0 first, fall back to 1.0 if needed
      baseUrl = `${domain}/rest/api/2.0/repositories?pagelen=100`;
    } else {
      // BitBucket Cloud format (will need workspace)
      baseUrl = `${domain}/2.0/repositories?pagelen=100`;
    }

    let allRepositories: BitBucketRepository[] = [];
    let url: string | null = baseUrl;
    let page = 1;
    let triedApi1Fallback = false;
    const maxPages = 1000; // Safety limit to prevent infinite loops
    const seenUrls = new Set<string>(); // Track URLs to detect loops

    while (url && page <= maxPages) {
      // Safety check: prevent infinite loops by tracking seen URLs
      if (seenUrls.has(url)) {
        console.warn(
          `Detected loop: URL ${url} was already fetched. Stopping pagination.`
        );
        break;
      }
      seenUrls.add(url);

      console.log(`Fetching repositories page ${page} from ${url}`);

      try {
        const response: BitBucketRepositoriesResponse =
          await this.fetchRequest(url);

        // Handle both API 2.0 (values) and API 1.0 (repositories) formats
        const repos = response.values || response.repositories || [];
        console.log(`Received ${repos.length} repositories in this page`);
        if (repos.length > 0) {
          console.log(
            "Sample repository structure:",
            JSON.stringify(repos[0], null, 2)
          );
        }

        allRepositories = allRepositories.concat(repos);

        console.log(`Total repositories so far: ${allRepositories.length}`);
        console.log(`Response pagination info:`, {
          size: response.size,
          pagelen: response.pagelen,
          page: response.page,
          next: response.next,
          isLastPage: response.isLastPage,
          nextPageStart: response.nextPageStart,
        });

        // Check if there's a next page
        // API 2.0 uses 'next' field (can be a URL string or in links object)
        let nextUrl: string | null = null;

        if (response.next) {
          // Direct 'next' field (API 2.0)
          nextUrl = response.next;
        } else if ((response as any).links?.next?.href) {
          // Next URL in links object (alternative API 2.0 format)
          nextUrl = (response as any).links.next.href;
        } else if (
          !response.isLastPage &&
          response.nextPageStart !== undefined
        ) {
          // API 1.0 pagination - construct next URL with start parameter
          const currentUrl = new URL(url || baseUrl);
          currentUrl.searchParams.set(
            "start",
            response.nextPageStart.toString()
          );
          nextUrl = currentUrl.toString();
        } else if (repos.length === (response.pagelen || 100)) {
          // If we got exactly the page length, there might be more pages
          // Try to construct next page URL manually using different pagination methods
          const currentUrl = new URL(url || baseUrl);

          // Try page-based pagination first
          if (response.page !== undefined) {
            const nextPage = response.page + 1;
            currentUrl.searchParams.set("page", nextPage.toString());
            nextUrl = currentUrl.toString();
            console.log(
              `No 'next' field found, trying page-based pagination: page ${nextPage}`
            );
          } else {
            // Try start-based pagination (offset)
            const currentStart = parseInt(
              currentUrl.searchParams.get("start") || "0"
            );
            const nextStart = currentStart + repos.length;
            currentUrl.searchParams.set("start", nextStart.toString());
            nextUrl = currentUrl.toString();
            console.log(
              `No 'next' field found, trying start-based pagination: start=${nextStart}`
            );
          }
        } else {
          // We got fewer results than requested, likely the last page
          console.log(
            `Received ${repos.length} repos (less than page size ${response.pagelen || 100}), assuming last page`
          );
          nextUrl = null;
        }

        url = nextUrl;
        page++;

        if (url) {
          console.log(`Continuing to next page: ${url}`);
        } else {
          console.log(`No more pages to fetch`);
        }
      } catch (error) {
        // If API 2.0 fails on BitBucket Server, try API 1.0 as fallback
        if (
          isBitBucketServer &&
          !triedApi1Fallback &&
          url?.includes("/rest/api/2.0/")
        ) {
          console.log("API 2.0 failed, trying API 1.0 endpoint as fallback...");
          triedApi1Fallback = true;
          // BitBucket Server API 1.0 uses /rest/api/1.0/repos (singular)
          const api1Url = `${domain}/rest/api/1.0/repos?limit=100`;
          url = api1Url;
          page = 1; // Reset page counter
          allRepositories = []; // Reset repositories
          continue;
        }
        throw error;
      }
    }

    if (page > maxPages) {
      console.warn(
        `Reached maximum page limit (${maxPages}). There may be more repositories.`
      );
    }

    console.log(
      `Fetched ${allRepositories.length} total repositories across ${page - 1} pages`
    );
    return allRepositories;
  }

  async fetchRequest(url: string) {
    const apiToken = process.env.BITBUCKET_API_TOKEN;
    if (!apiToken) {
      throw new Error("BITBUCKET_API_TOKEN environment variable is not set");
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      // Try to get error details from response body
      let errorBody = "";
      try {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          errorBody = await response.text();
          console.error("Error response body:", errorBody);
          try {
            const errorJson = JSON.parse(errorBody);
            console.error(
              "Parsed error JSON:",
              JSON.stringify(errorJson, null, 2)
            );
          } catch (e) {
            // Not JSON, that's okay
          }
        } else {
          errorBody = await response.text();
          console.error(
            "Error response body (non-JSON):",
            errorBody.substring(0, 500)
          );
        }
      } catch (e) {
        console.error("Could not read error response body:", e);
      }

      throw new Error(
        `Failed to fetch data: ${url} - Status: ${response.status} ${response.statusText}${errorBody ? ` - Body: ${errorBody.substring(0, 200)}` : ""}`
      );
    }

    return response.json();
  }

  async getPullRequestsForRepositories(
    repositories: BitBucketRepository[],
    monthsBack: number = 3,
    useCache: boolean = true
  ): Promise<
    Array<{
      repository: BitBucketRepository;
      pullRequests: BitBucketPullRequest[];
    }>
  > {
    // Create cache key from repository IDs
    const repoIds = repositories
      .map((r) => r.full_name || r.uuid || r.slug)
      .sort()
      .join(",");
    const cacheKey = `prs_${repoIds}`;

    // Check cache if useCache is true
    if (useCache && this.prCache.has(cacheKey)) {
      const cached = this.prCache.get(cacheKey)!;
      console.log(
        `Returning cached PR data (cached at: ${new Date(cached.timestamp).toISOString()})`
      );
      return cached.data;
    }

    const domain = process.env.BITBUCKET_DOMAIN;
    if (!domain) {
      throw new Error("BITBUCKET_DOMAIN environment variable is not set");
    }

    const isBitBucketServer = !domain.includes("api.bitbucket.org");

    const results: Array<{
      repository: BitBucketRepository;
      pullRequests: BitBucketPullRequest[];
    }> = [];

    for (let i = 0; i < repositories.length; i++) {
      const repo = repositories[i];

      try {
        const prs = await this.getPullRequestsForRepository(
          repo,
          null, // No date filter - get all PRs
          isBitBucketServer
        );
        results.push({
          repository: repo,
          pullRequests: prs,
        });
      } catch (error) {
        console.error(
          `Error fetching PRs for ${repo.full_name || repo.name}:`,
          error
        );
        // Continue with other repositories even if one fails
        results.push({
          repository: repo,
          pullRequests: [],
        });
      }
    }

    // Cache the results
    this.prCache.set(cacheKey, {
      data: results,
      timestamp: Date.now(),
      repositoryIds: repositories.map((r) => r.full_name || r.uuid || r.slug),
    });

    return results;
  }

  getCachedPRDataTimestamp(repositories: BitBucketRepository[]): number | null {
    const repoIds = repositories
      .map((r) => r.full_name || r.uuid || r.slug)
      .sort()
      .join(",");
    const cacheKey = `prs_${repoIds}`;
    const cached = this.prCache.get(cacheKey);
    return cached ? cached.timestamp : null;
  }

  clearPRCache(repositories: BitBucketRepository[]): void {
    const repoIds = repositories
      .map((r) => r.full_name || r.uuid || r.slug)
      .sort()
      .join(",");
    const cacheKey = `prs_${repoIds}`;
    this.prCache.delete(cacheKey);
    console.log(`Cleared PR cache for: ${cacheKey}`);
  }

  async getPullRequestsForRepository(
    repository: BitBucketRepository,
    dateFilter: string | null,
    isBitBucketServer: boolean
  ): Promise<BitBucketPullRequest[]> {
    const domain = process.env.BITBUCKET_DOMAIN;
    if (!domain) {
      throw new Error("BITBUCKET_DOMAIN environment variable is not set");
    }

    // Try multiple methods to extract project key and repo slug
    let projectKey: string | undefined;
    let repoSlug: string | undefined;
    let workspace: string | undefined;

    // Method 1: Try full_name (format: "project/repo" or "workspace/repo")
    const fullName = repository.full_name || "";
    if (fullName) {
      const parts = fullName.split("/");
      if (parts.length >= 2) {
        projectKey = parts[0];
        workspace = parts[0];
        repoSlug = parts[1];
      }
    }

    // Method 2: Try extracting from self link URL
    if (!projectKey || !repoSlug) {
      const selfLink = repository.links?.self?.href;
      if (selfLink) {
        // Extract from URL like: /rest/api/2.0/repositories/{project}/{repo}
        const match = selfLink.match(/repositories\/([^\/]+)\/([^\/]+)/);
        if (match) {
          projectKey = match[1];
          workspace = match[1];
          repoSlug = match[2];
        } else {
          // Try API 1.0 format: /rest/api/1.0/projects/{project}/repos/{repo}
          const match1 = selfLink.match(/projects\/([^\/]+)\/repos\/([^\/]+)/);
          if (match1) {
            projectKey = match1[1];
            repoSlug = match1[2];
          }
        }
      }
    }

    // Method 3: Try repository object fields (API 1.0 might have project field)
    if (!projectKey || !repoSlug) {
      if ((repository as any).project?.key) {
        projectKey = (repository as any).project.key;
      }
      if (repository.slug) {
        repoSlug = repository.slug;
      }
    }

    // Method 4: Use slug as fallback if we have at least that
    if (!repoSlug && repository.slug) {
      repoSlug = repository.slug;
    }

    // If we still don't have what we need, log the repository structure for debugging
    if (!projectKey || !repoSlug) {
      console.error(
        "Repository structure:",
        JSON.stringify(repository, null, 2)
      );
      throw new Error(
        `Cannot determine repository path. full_name: "${fullName}", slug: "${repository.slug}", self link: "${repository.links?.self?.href}"`
      );
    }

    let baseUrl: string;
    if (isBitBucketServer) {
      // BitBucket Server: /rest/api/1.0/projects/{projectKey}/repos/{repoSlug}/pull-requests
      // or /rest/api/2.0/repositories/{workspace}/{repo_slug}/pullrequests
      // Try API 2.0 first - filter for merged PRs only (no date filter)
      if (dateFilter) {
        baseUrl = `${domain}/rest/api/2.0/repositories/${projectKey}/${repoSlug}/pullrequests?q=state="MERGED"+AND+created_on>${dateFilter}&pagelen=100`;
      } else {
        baseUrl = `${domain}/rest/api/2.0/repositories/${projectKey}/${repoSlug}/pullrequests?q=state="MERGED"&pagelen=100`;
      }
    } else {
      // BitBucket Cloud: /2.0/repositories/{workspace}/{repo_slug}/pullrequests
      // Filter for merged PRs only (no date filter)
      if (dateFilter) {
        baseUrl = `${domain}/2.0/repositories/${workspace || projectKey}/${repoSlug}/pullrequests?q=state="MERGED"+AND+created_on>${dateFilter}&pagelen=100`;
      } else {
        baseUrl = `${domain}/2.0/repositories/${workspace || projectKey}/${repoSlug}/pullrequests?q=state="MERGED"&pagelen=100`;
      }
    }

    let allPRs: BitBucketPullRequest[] = [];
    let url: string | null = baseUrl;
    let page = 1;
    const maxPages = 100;
    const seenUrls = new Set<string>();

    while (url && page <= maxPages) {
      if (seenUrls.has(url)) {
        console.warn(
          `Detected loop: URL ${url} was already fetched. Stopping pagination.`
        );
        break;
      }
      seenUrls.add(url);

      try {
        console.log(`  Requesting: ${url}`);
        const response: BitBucketPullRequestsResponse =
          await this.fetchRequest(url);

        const prs = response.values || [];
        console.log(
          `  Page ${page}: Received ${prs.length} PRs from API (total so far: ${allPRs.length + prs.length})`
        );
        allPRs = allPRs.concat(prs);

        // Check for next page using isLastPage
        let nextUrl: string | null = null;
        const isLastPage =
          response.isLastPage !== undefined
            ? response.isLastPage
            : (response as any).isLastPage;

        if (isLastPage === false) {
          // There are more pages, construct next page URL
          const currentUrl = new URL(url);

          // Try different pagination methods
          if (response.page !== undefined) {
            // Page-based pagination
            const nextPage = response.page + 1;
            currentUrl.searchParams.set("page", nextPage.toString());
            nextUrl = currentUrl.toString();
            console.log(
              `  Not last page, constructing next page URL: page ${nextPage}`
            );
          } else if ((response as any).nextPageStart !== undefined) {
            // Start-based pagination (API 1.0)
            currentUrl.searchParams.set(
              "start",
              (response as any).nextPageStart.toString()
            );
            nextUrl = currentUrl.toString();
            console.log(
              `  Not last page, constructing next page URL: start=${(response as any).nextPageStart}`
            );
          } else {
            // Try incrementing start parameter if it exists
            const currentStart = parseInt(
              currentUrl.searchParams.get("start") || "0"
            );
            const nextStart = currentStart + prs.length;
            currentUrl.searchParams.set("start", nextStart.toString());
            nextUrl = currentUrl.toString();
            console.log(
              `  Not last page, constructing next page URL: start=${nextStart}`
            );
          }
        } else {
          console.log(`  Last page reached (isLastPage: ${isLastPage})`);
        }

        url = nextUrl;
        page++;
      } catch (error) {
        // If API 2.0 fails, try API 1.0 for BitBucket Server
        if (
          isBitBucketServer &&
          url?.includes("/rest/api/2.0/") &&
          page === 1 &&
          projectKey &&
          repoSlug
        ) {
          // For API 1.0, we need to fetch all and filter by state=MERGED
          // API 1.0 doesn't support state filter in query, so we'll fetch all and filter
          baseUrl = `${domain}/rest/api/1.0/projects/${projectKey}/repos/${repoSlug}/pull-requests?limit=1000&state=MERGED`;
          url = baseUrl;
          page = 1;
          allPRs = [];
          seenUrls.clear();
          continue;
        }
        throw error;
      }
    }

    // Filter PRs by merged state only (no date filter)
    const mergedPRs = allPRs.filter((pr) => {
      const isMerged =
        pr.state === "MERGED" ||
        (pr.closed === true &&
          pr.state !== "DECLINED" &&
          pr.state !== "SUPERSEDED");
      return isMerged;
    });
    console.log(`  After filtering by merged state: ${mergedPRs.length} PRs`);

    return mergedPRs;
  }
}
