import { Router } from "express";
import HiBobRequester from "../HiBobRequester";

const hibobRoute = Router();

hibobRoute.get("/employees", async (_req, res) => {
  try {
    const hibob = new HiBobRequester();
    const employees = await hibob.getEmployees();
    res.json(employees);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

hibobRoute.get("/holidays", async (req, res) => {
  const year = parseInt(req.query.year as string);
  const month = parseInt(req.query.month as string);
  if (!year || !month || month < 1 || month > 12) {
    res.status(400).json({ error: "year and month (1-12) are required" });
    return;
  }
  try {
    const hibob = new HiBobRequester();
    const holidays = await hibob.getHolidays(year, month);
    res.json(holidays);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default hibobRoute;
