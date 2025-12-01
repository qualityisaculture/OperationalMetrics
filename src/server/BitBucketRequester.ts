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

export default class BitBucketRequester {
  constructor() {}

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

    console.log(`Making request to: ${url}`);
    console.log(
      `Using Authorization header with token (length: ${apiToken.length})`
    );

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        Accept: "application/json",
      },
    });

    console.log(`Response status: ${response.status} ${response.statusText}`);
    console.log(
      `Response headers:`,
      Object.fromEntries(response.headers.entries())
    );

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
}
