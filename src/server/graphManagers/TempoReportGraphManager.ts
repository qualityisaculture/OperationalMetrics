// Types for Tempo API responses
export interface TempoAccount {
  id: number;
  key: string;
  name: string;
  status: string;
  category?: string;
  customer?: string;
  lead?: string;
  description?: string;
}

export interface TempoWorklog {
  id: number;
  issueKey: string;
  timeSpentSeconds: number;
  dateCreated: string;
  dateUpdated: string;
  author: {
    name: string;
    displayName: string;
  };
  workDescription?: string;
  accountKey?: string;
}

export default class TempoReportGraphManager {
  private tempoToken: string;
  private tempoBaseUrl: string;

  constructor() {
    this.tempoToken = process.env.TEMPO_API_TOKEN || "";
    this.tempoBaseUrl = "https://api.tempo.io";
  }

  async getAccounts(): Promise<TempoAccount[]> {
    try {
      const allAccounts: TempoAccount[] = [];
      let hasMorePages = true;
      let offset = 0;
      const limit = 50; // Default page size for Tempo API
      let pageCount = 0;

      console.log("Starting pagination fetch for Tempo accounts...");

      while (hasMorePages) {
        pageCount++;
        console.log(`\n--- Page ${pageCount} ---`);
        console.log(
          `Making API call: /4/accounts?limit=${limit}&offset=${offset}`
        );

        // Use proper pagination parameters according to Tempo API docs
        const response = await this.makeTempoApiCall(
          `/4/accounts?limit=${limit}&offset=${offset}`
        );

        console.log("Raw API response:", JSON.stringify(response, null, 2));
        console.log("Response type:", typeof response);
        console.log("Is response an array?", Array.isArray(response));

        // Handle different possible response structures
        let accounts;
        let totalCount = 0;
        let currentPageSize = 0;

        if (Array.isArray(response)) {
          // Direct array response (no pagination metadata)
          console.log("Detected: Direct array response (no pagination)");
          accounts = response;
          currentPageSize = accounts.length;
          hasMorePages = false; // If it's a direct array, assume no pagination
        } else if (
          response &&
          response.metadata &&
          Array.isArray(response.results)
        ) {
          // Tempo API paginated response with metadata and results
          console.log("Detected: Tempo API paginated response with metadata");
          accounts = response.results;
          currentPageSize = accounts.length;
          totalCount = response.metadata.count || 0;
          // Check if there's a next page URL
          hasMorePages = !!response.metadata.next;
          console.log("Metadata:", response.metadata);
        } else if (response && Array.isArray(response.results)) {
          // Paginated response with results array
          console.log("Detected: Paginated response with results array");
          accounts = response.results;
          currentPageSize = accounts.length;
          totalCount = response.totalCount || response.total || 0;
          hasMorePages = offset + currentPageSize < totalCount;
        } else if (response && Array.isArray(response.data)) {
          // Paginated response with data array
          console.log("Detected: Paginated response with data array");
          accounts = response.data;
          currentPageSize = accounts.length;
          totalCount = response.totalCount || response.total || 0;
          hasMorePages = offset + currentPageSize < totalCount;
        } else if (
          response &&
          response.values &&
          Array.isArray(response.values)
        ) {
          // Paginated response with values array
          console.log("Detected: Paginated response with values array");
          accounts = response.values;
          currentPageSize = accounts.length;
          totalCount = response.totalCount || response.total || 0;
          hasMorePages = offset + currentPageSize < totalCount;
        } else {
          console.error("Unexpected response structure:", response);
          throw new Error("Unexpected API response structure");
        }

        console.log(`Accounts in this page: ${currentPageSize}`);
        console.log(`Total count from API: ${totalCount}`);
        console.log(`Current offset: ${offset}`);
        console.log(`Has more pages: ${hasMorePages}`);

        // Transform the accounts from this page
        const transformedAccounts = accounts.map((account: any) => ({
          id: account.id,
          key: account.key,
          name: account.name,
          status: account.status,
          category: account.category?.name,
          customer: account.customer?.name,
          lead: account.lead?.accountId, // Note: lead is an accountId, not displayName
          description: account.description,
        }));

        console.log(
          `Transformed ${transformedAccounts.length} accounts from this page`
        );
        allAccounts.push(...transformedAccounts);

        // Move to next page
        offset += currentPageSize;
        console.log(`New offset for next page: ${offset}`);

        // Safety check to prevent infinite loops
        if (offset > 10000) {
          console.warn(
            "Pagination safety limit reached, stopping at 10,000 accounts"
          );
          break;
        }
      }

      console.log(`\n=== Pagination Complete ===`);
      console.log(`Total pages fetched: ${pageCount}`);
      console.log(`Total accounts collected: ${allAccounts.length}`);

      return allAccounts;
    } catch (error) {
      console.error("Error fetching accounts from Tempo API:", error);
      throw error; // Re-throw the error instead of falling back to dummy data
    }
  }

  async getWorklogs(
    startDate?: string,
    endDate?: string
  ): Promise<TempoWorklog[]> {
    // TODO: Implement real Tempo worklogs API call
    // This will be implemented in the next phase
    return [];
  }

  private async makeTempoApiCall(endpoint: string): Promise<any> {
    if (!this.tempoToken) {
      throw new Error("TEMPO_API_TOKEN environment variable is not set");
    }

    const response = await fetch(`${this.tempoBaseUrl}${endpoint}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.tempoToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Tempo API error: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }
}
