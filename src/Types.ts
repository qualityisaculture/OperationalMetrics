import { Send, Query } from "express-serve-static-core";
export interface TypedResponse<ResBody> extends Express.Response {
  json: Send<ResBody, this>;
}
export interface TypedRequestBody<T> extends Express.Request {
  body: T;
}
export interface TypedRequestQuery<T extends Query> extends Express.Request {
  query: T;
}
export type WithWildcards<T> = T & { [key: string]: unknown };

// In TS, interfaces are "open" and can be extended
interface Date {
  /**
   * Give a more precise return type to the method `toISOString()`:
   * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString
   */
  toISOString(): TDateISO;
}

type TYear = `${number}${number}${number}${number}`;
type TMonth = `${number}${number}`;
type TDay = `${number}${number}`;
type THours = `${number}${number}`;
type TMinutes = `${number}${number}`;
type TSeconds = `${number}${number}`;
type TMilliseconds = `${number}${number}${number}`;

/**
 * Represent a string like `2021-01-08`
 */
export type TDateISODate = `${TYear}-${TMonth}-${TDay}`;
type TDateISOTime = `${THours}:${TMinutes}:${TSeconds}.${TMilliseconds}`;
type TDateISO = `${TDateISODate}T${TDateISOTime}Z`;

export type MinimumIssueInfo = {
  key: string;
  summary: string;
  url: string;
};

export type StatusDays = {
  status: string;
  days: number;
};
