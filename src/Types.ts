import { Send, Query } from 'express-serve-static-core';
export interface TypedResponse<ResBody> extends Express.Response {
  json: Send<ResBody, this>;
}
export interface TypedRequestBody<T> extends Express.Request {
  body: T
}
export interface TypedRequestQuery<T extends Query> extends Express.Request {
  query: T
}
