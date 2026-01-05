export interface LeadTimeConfig {
  query: string;
  currentSprintStartDate: string;
  numberOfSprints: number;
  splitMode: "timebooked" | "statuses";
  viewMode: "sprint" | "combined";
  filterNoTimeBooked: boolean;
  statusesSelected: string[];
  ticketTypesSelected: string[];
}

export interface DashboardMetric {
  id: string;
  type: "leadTime";
  name: string;
  config: LeadTimeConfig;
}

export interface Dashboard {
  id: string;
  name: string;
  metrics: DashboardMetric[];
}

export interface DashboardConfig {
  dashboards: Dashboard[];
}

