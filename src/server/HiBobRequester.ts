const HIBOB_BASE_URL = "https://api.hibob.com/v1";

interface HiBobEmployee {
  id: string;
  displayName: string;
  work?: {
    manager?: string;
  };
}

interface HiBobOut {
  employeeId: string;
  employeeDisplayName: string;
  startDate: string;
  endDate: string;
  isHourly: boolean;
  type?: {
    policyTypeDisplayName?: string;
  };
}

export interface HiBobUserListEntry {
  firstName: string;
  lastName: string;
  fullName: string;
  lineManager: string;
}

export interface HiBobHolidayEntry {
  firstName: string;
  lastName: string;
  daysOff: number;
}

export default class HiBobRequester {
  private authHeader: string;

  constructor() {
    const userId = process.env.HIBOB_SERVICE_USER_ID;
    const token = process.env.HIBOB_SERVICE_USER_TOKEN;
    if (!userId || !token) {
      throw new Error("HiBob credentials missing from environment");
    }
    this.authHeader = "Basic " + Buffer.from(`${userId}:${token}`).toString("base64");
  }

  private async fetchRequest<T>(path: string): Promise<T> {
    const response = await fetch(`${HIBOB_BASE_URL}${path}`, {
      headers: {
        Authorization: this.authHeader,
        Accept: "application/json",
      },
    });
    const text = await response.text();
    if (!response.ok || text.trimStart().startsWith("<")) {
      throw new Error(`HiBob API error ${response.status} (${path}): ${text.slice(0, 200)}`);
    }
    return JSON.parse(text) as T;
  }

  async getHolidays(year: number, month: number): Promise<HiBobHolidayEntry[]> {
    const pad = (n: number) => String(n).padStart(2, "0");
    const from = `${year}-${pad(month)}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const to = `${year}-${pad(month)}-${lastDay}`;

    const since = `${year - 1}-${pad(month)}-01T00:00:00%2B00:00`;
    const data = await this.fetchRequest<{ changes: unknown[] }>(
      `/timeoff/requests/changes?since=${since}`
    );

    console.log("HiBob holidays raw response:", JSON.stringify(data).slice(0, 2000));

    return [];
  }

  async testConnection(): Promise<{ success: boolean; employeeCount: number }> {
    const data = await this.fetchRequest<{ employees: unknown[] }>("/profiles");
    return { success: true, employeeCount: data.employees?.length ?? 0 };
  }

  async getEmployees(): Promise<HiBobUserListEntry[]> {
    const data = await this.fetchRequest<{ employees: HiBobEmployee[] }>("/profiles");
    const employees = data.employees ?? [];

    const idToName = new Map<string, string>();
    for (const emp of employees) {
      if (emp.id) idToName.set(emp.id, emp.displayName ?? "");
    }

    return employees.map((emp) => {
      const fullName = emp.displayName ?? "";
      const lastSpace = fullName.lastIndexOf(" ");
      const firstName = lastSpace > 0 ? fullName.slice(0, lastSpace) : fullName;
      const lastName = lastSpace > 0 ? fullName.slice(lastSpace + 1) : "";
      const lineManager = idToName.get(emp.work?.manager ?? "") ?? "";
      return { firstName, lastName, fullName, lineManager };
    });
  }
}

// Run as a standalone test: op run --env-file=.env.tpl -- ts-node src/server/HiBobRequester.ts
if (require.main === module) {
  (async () => {
    try {
      const hibob = new HiBobRequester();
      const result = await hibob.testConnection();
      console.log(`Connected to HiBob. Employees found: ${result.employeeCount}`);
    } catch (err) {
      console.error("HiBob connection failed:", err);
      process.exit(1);
    }
  })();
}
