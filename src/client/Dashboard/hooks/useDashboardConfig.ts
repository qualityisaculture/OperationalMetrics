import { useState, useEffect, useCallback } from "react";
import { DashboardConfig, Dashboard, DashboardMetric } from "../types";

const STORAGE_KEY_LAST_DASHBOARD = "dashboard_lastSelected";

export const useDashboardConfig = () => {
  const [config, setConfig] = useState<DashboardConfig>({ dashboards: [] });
  const [selectedDashboardId, setSelectedDashboardId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Get selected dashboard
  const selectedDashboard = config.dashboards.find(
    (d) => d.id === selectedDashboardId
  ) || null;

  // Fetch config from server
  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/dashboard/config");
      const result = await response.json();
      const parsedConfig: DashboardConfig = JSON.parse(result.data);
      setConfig(parsedConfig);

      // Restore last selected dashboard from localStorage
      const lastSelected = localStorage.getItem(STORAGE_KEY_LAST_DASHBOARD);
      if (lastSelected && parsedConfig.dashboards.find((d) => d.id === lastSelected)) {
        setSelectedDashboardId(lastSelected);
      } else if (parsedConfig.dashboards.length > 0) {
        // Select first dashboard if available
        setSelectedDashboardId(parsedConfig.dashboards[0].id);
        localStorage.setItem(STORAGE_KEY_LAST_DASHBOARD, parsedConfig.dashboards[0].id);
      }
    } catch (err) {
      console.error("Error fetching dashboard config:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch config");
      setConfig({ dashboards: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  // Save config to server
  const saveConfig = useCallback(async (newConfig: DashboardConfig) => {
    try {
      setError(null);
      const response = await fetch("/api/dashboard/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ config: newConfig }),
      });

      if (!response.ok) {
        throw new Error("Failed to save config");
      }

      const result = await response.json();
      const parsedConfig: DashboardConfig = JSON.parse(result.data);
      setConfig(parsedConfig);
      return parsedConfig;
    } catch (err) {
      console.error("Error saving dashboard config:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to save config";
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Select a dashboard
  const selectDashboard = useCallback((dashboardId: string) => {
    if (config.dashboards.find((d) => d.id === dashboardId)) {
      setSelectedDashboardId(dashboardId);
      localStorage.setItem(STORAGE_KEY_LAST_DASHBOARD, dashboardId);
    }
  }, [config]);

  // Create a new dashboard
  const createDashboard = useCallback(
    async (name: string) => {
      const newDashboard: Dashboard = {
        id: `dashboard-${Date.now()}`,
        name,
        metrics: [],
      };
      const newConfig: DashboardConfig = {
        dashboards: [...config.dashboards, newDashboard],
      };
      const saved = await saveConfig(newConfig);
      setSelectedDashboardId(newDashboard.id);
      localStorage.setItem(STORAGE_KEY_LAST_DASHBOARD, newDashboard.id);
      return saved.dashboards.find((d) => d.id === newDashboard.id)!;
    },
    [config, saveConfig]
  );

  // Duplicate a dashboard
  const duplicateDashboard = useCallback(
    async (dashboardId: string) => {
      const dashboard = config.dashboards.find((d) => d.id === dashboardId);
      if (!dashboard) {
        throw new Error("Dashboard not found");
      }

      const newDashboard: Dashboard = {
        id: `dashboard-${Date.now()}`,
        name: `${dashboard.name} (Copy)`,
        metrics: JSON.parse(JSON.stringify(dashboard.metrics)), // Deep copy
      };
      const newConfig: DashboardConfig = {
        dashboards: [...config.dashboards, newDashboard],
      };
      const saved = await saveConfig(newConfig);
      setSelectedDashboardId(newDashboard.id);
      localStorage.setItem(STORAGE_KEY_LAST_DASHBOARD, newDashboard.id);
      return saved.dashboards.find((d) => d.id === newDashboard.id)!;
    },
    [config, saveConfig]
  );

  // Delete a dashboard
  const deleteDashboard = useCallback(
    async (dashboardId: string) => {
      const newConfig: DashboardConfig = {
        dashboards: config.dashboards.filter((d) => d.id !== dashboardId),
      };
      await saveConfig(newConfig);

      // If we deleted the selected dashboard, select another one
      if (selectedDashboardId === dashboardId) {
        if (newConfig.dashboards.length > 0) {
          const newSelected = newConfig.dashboards[0].id;
          setSelectedDashboardId(newSelected);
          localStorage.setItem(STORAGE_KEY_LAST_DASHBOARD, newSelected);
        } else {
          setSelectedDashboardId(null);
          localStorage.removeItem(STORAGE_KEY_LAST_DASHBOARD);
        }
      }
    },
    [config, saveConfig, selectedDashboardId]
  );

  // Update dashboard name
  const updateDashboardName = useCallback(
    async (dashboardId: string, name: string) => {
      const newConfig: DashboardConfig = {
        dashboards: config.dashboards.map((d) =>
          d.id === dashboardId ? { ...d, name } : d
        ),
      };
      await saveConfig(newConfig);
    },
    [config, saveConfig]
  );

  // Add a new metric to selected dashboard
  const addMetric = useCallback(
    async (metric: DashboardMetric) => {
      if (!selectedDashboardId) {
        throw new Error("No dashboard selected");
      }
      const newConfig: DashboardConfig = {
        dashboards: config.dashboards.map((d) =>
          d.id === selectedDashboardId
            ? { ...d, metrics: [...d.metrics, metric] }
            : d
        ),
      };
      await saveConfig(newConfig);
    },
    [config, saveConfig, selectedDashboardId]
  );

  // Update an existing metric in selected dashboard
  const updateMetric = useCallback(
    async (metricId: string, updatedMetric: DashboardMetric) => {
      if (!selectedDashboardId) {
        throw new Error("No dashboard selected");
      }
      const newConfig: DashboardConfig = {
        dashboards: config.dashboards.map((d) =>
          d.id === selectedDashboardId
            ? {
                ...d,
                metrics: d.metrics.map((m) =>
                  m.id === metricId ? updatedMetric : m
                ),
              }
            : d
        ),
      };
      await saveConfig(newConfig);
      // Update local state immediately so UI reflects the change
      setConfig(newConfig);
    },
    [config, saveConfig, selectedDashboardId]
  );

  // Delete a metric from selected dashboard
  const deleteMetric = useCallback(
    async (metricId: string) => {
      if (!selectedDashboardId) {
        throw new Error("No dashboard selected");
      }
      const newConfig: DashboardConfig = {
        dashboards: config.dashboards.map((d) =>
          d.id === selectedDashboardId
            ? { ...d, metrics: d.metrics.filter((m) => m.id !== metricId) }
            : d
        ),
      };
      await saveConfig(newConfig);
    },
    [config, saveConfig, selectedDashboardId]
  );

  // Load config on mount
  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return {
    config,
    selectedDashboard,
    selectedDashboardId,
    loading,
    error,
    fetchConfig,
    saveConfig,
    selectDashboard,
    createDashboard,
    duplicateDashboard,
    deleteDashboard,
    updateDashboardName,
    addMetric,
    updateMetric,
    deleteMetric,
  };
};
