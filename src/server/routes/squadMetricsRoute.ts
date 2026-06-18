import { Router } from "express";
import SquadMetricsRequester from "../SquadMetricsRequester";

const squadMetricsRoute = Router();

squadMetricsRoute.get("/absences", async (req, res) => {
  const year = parseInt(req.query.year as string);
  const month = parseInt(req.query.month as string);
  if (!year || !month || month < 1 || month > 12) {
    res.status(400).json({ error: "year and month (1-12) are required" });
    return;
  }
  try {
    const requester = new SquadMetricsRequester();
    const absences = await requester.getAbsences(year, month);
    res.json(absences);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default squadMetricsRoute;
