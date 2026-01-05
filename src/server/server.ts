//Create a default express server and listen on port 3000
import express from "express";
import path from "path";
import { metricsRoute } from "./routes/metricsRoute";
import dashboardRoute from "./routes/dashboardRoute";

let app;

const Server = (
  mode: "default" | "dev" | "e2e",
  application?: Express.Application
) => {
  app = application || express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(path.join(__dirname, ".")));

  app.use("/api", metricsRoute);
  app.use("/api/dashboard", dashboardRoute);

  app.get("/favicon.svg", (req, res) => {
    console.log("Favicon Request received " + req.url);
    res.sendFile(path.join(__dirname, "../../dist/favicon.svg"));
  });
  app.get("/", (req, res) => {
    console.log("Request received " + req.url);
    res.sendFile(path.join(__dirname, "../../dist/index.html"));
  });

  return app;
};
module.exports = Server;
