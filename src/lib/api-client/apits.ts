// ---------------------------------------------------------------------------
// apits adapter: the single-argument surface consumed by the functions
// `npm run apits` generates — request.get<Req, Res>(url, { params, ...extra }).
//
// It is generated-code plumbing and identical in every host, so it lives with
// the client it wraps (devbie ADR-080 D2). Hosts keep only their own session
// wiring (e.g. the login redirect on session expiry) next to a re-export.
// ---------------------------------------------------------------------------

import type { AxiosRequestConfig } from "axios";

import { apiClient } from "./client";

/** Transport-level overrides accepted as the second argument of generated API functions. */
export type ClientRequestConfig = AxiosRequestConfig;

export const request = {
  get<_Req, Res>(url: string, config?: ClientRequestConfig): Promise<Res> {
    return apiClient.get<Res>(url, config);
  },
  post<_Req, Res>(url: string, config?: ClientRequestConfig): Promise<Res> {
    return apiClient.post<Res>(url, config?.data, config);
  },
  put<_Req, Res>(url: string, config?: ClientRequestConfig): Promise<Res> {
    return apiClient.put<Res>(url, config?.data, config);
  },
  patch<_Req, Res>(url: string, config?: ClientRequestConfig): Promise<Res> {
    return apiClient.patch<Res>(url, config?.data, config);
  },
  delete<_Req, Res>(url: string, config?: ClientRequestConfig): Promise<Res> {
    return apiClient.delete<Res>(url, config);
  },
};
