import { Pool } from "pg";

export interface AbsenceEntry {
  firstName: string;
  lastName: string;
  absenceDate: string;
  isHalf: boolean;
}

export default class SquadMetricsRequester {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: process.env.SQUADMETRICS_HOST ?? "engine-monitor.hpd.int",
      port: parseInt(process.env.SQUADMETRICS_PORT ?? "5432"),
      database: process.env.SQUADMETRICS_DB ?? "squadmetrics",
      user: process.env.SQUADMETRICS_USER ?? "admin",
      password: process.env.SQUADMETRICS_PASSWORD ?? "admin",
    });
  }

  async getAbsences(year: number, month: number): Promise<AbsenceEntry[]> {
    const pad = (n: number) => String(n).padStart(2, "0");
    const from = `${year}-${pad(month)}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const to = `${year}-${pad(month)}-${pad(lastDay)}`;

    const result = await this.pool.query<{ name: string; absencedate: string; ishalf: boolean }>(
      `SELECT u.name, a.absencedate::text, ua.ishalf
       FROM userabsence ua
       INNER JOIN absence a ON a.id = ua.absenceid
       INNER JOIN users u ON u.employeeid = ua.employeeid
       WHERE a.absencedate >= $1 AND a.absencedate <= $2
         AND extract(dow from a.absencedate) NOT IN (0, 6)
       ORDER BY u.name, a.absencedate`,
      [from, to]
    );

    return result.rows.map((row) => {
      const name = row.name ?? "";
      const lastSpace = name.lastIndexOf(" ");
      const firstName = lastSpace > 0 ? name.slice(0, lastSpace) : name;
      const lastName = lastSpace > 0 ? name.slice(lastSpace + 1) : "";
      return { firstName, lastName, absenceDate: row.absencedate, isHalf: row.ishalf };
    });
  }
}
