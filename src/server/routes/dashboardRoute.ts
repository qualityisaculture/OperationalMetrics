const express = require("express");
const dashboardRoute = express.Router();
import { Request, Response } from "express";
import * as fs from "fs";
import * as path from "path";
import { TypedResponse as TR, TypedRequestBody as TRB } from "../../Types";
import { DashboardConfig } from "../../client/Dashboard/types";

const CONFIG_FILE_PATH = path.join(__dirname, "../data/dashboardConfig.json");

// Helper function to read config file
const readConfig = (): DashboardConfig => {
  try {
    const fileContent = fs.readFileSync(CONFIG_FILE_PATH, "utf-8");
    const parsed = JSON.parse(fileContent);
    // Migrate old format to new format if needed
    if (parsed.metrics && !parsed.dashboards) {
      return {
        dashboards: [
          {
            id: "default",
            name: "Default Dashboard",
            metrics: parsed.metrics,
          },
        ],
      };
    }
    return parsed;
  } catch (error) {
    // If file doesn't exist or is invalid, return default config
    return { dashboards: [] };
  }
};

// Helper function to write config file
const writeConfig = (config: DashboardConfig): void => {
  try {
    // Ensure directory exists
    const dir = path.dirname(CONFIG_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(
      CONFIG_FILE_PATH,
      JSON.stringify(config, null, 2),
      "utf-8"
    );
  } catch (error) {
    console.error("Error writing dashboard config:", error);
    throw error;
  }
};

// GET /api/dashboard/config - Get all dashboards configuration
dashboardRoute.get(
  "/config",
  (req: Request, res: Response | TR<{ message: string; data: string }>) => {
    try {
      const config = readConfig();
      res.json({ message: "Dashboard config", data: JSON.stringify(config) });
    } catch (error) {
      console.error("Error reading dashboard config:", error);
      (res as Response).status(500).json({
        message: "Error reading dashboard config",
        data: JSON.stringify({ dashboards: [] }),
      });
    }
  }
);

// GET /api/dashboard/config/:dashboardId - Get specific dashboard
dashboardRoute.get(
  "/config/:dashboardId",
  (req: Request, res: Response | TR<{ message: string; data: string }>) => {
    try {
      const config = readConfig();
      const dashboardId = req.params.dashboardId;
      const dashboard = config.dashboards.find((d) => d.id === dashboardId);

      if (!dashboard) {
        (res as Response).status(404).json({
          message: "Dashboard not found",
          data: JSON.stringify(null),
        });
        return;
      }

      res.json({ message: "Dashboard", data: JSON.stringify(dashboard) });
    } catch (error) {
      console.error("Error reading dashboard:", error);
      (res as Response).status(500).json({
        message: "Error reading dashboard",
        data: JSON.stringify(null),
      });
    }
  }
);

// POST /api/dashboard/config - Save all dashboards configuration
dashboardRoute.post(
  "/config",
  (
    req: TRB<{ config: DashboardConfig }>,
    res: Response | TR<{ message: string; data: string }>
  ) => {
    try {
      const config = req.body.config;
      writeConfig(config);
      res.json({
        message: "Dashboard config saved successfully",
        data: JSON.stringify(config),
      });
    } catch (error) {
      console.error("Error saving dashboard config:", error);
      (res as Response).status(500).json({
        message: "Error saving dashboard config",
        data: JSON.stringify({ error: String(error) }),
      });
    }
  }
);

export default dashboardRoute;
