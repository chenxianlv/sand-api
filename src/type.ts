import type { AxiosRequestConfig } from 'axios';
import type { PROCESS_BRAND } from './helper';

export type AppRoute = {
  // 不对 GET、DELETE 的请求体等进行 HTTP 规范检查
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /**
   * 语法糖，会基于此字段在请求发送前进行预处理
   */
  contentType?:
    | 'application/json'
    | 'multipart/form-data'
    | 'application/x-www-form-urlencoded'
    | 'application/octet-stream';
  path: string;
  pathParams?: any;
  query?: any;
  headers?: any;
  summary?: string;
  description?: string;
  deprecated?: boolean;
  responses?: Record<number, any>;
  strictStatusCodes?: boolean;
  metadata?: unknown;
  body?: any;
};

type ExtractPreprocessInput<T extends AppRoute> = T extends { _payloadPreprocess?: infer Fn }
  ? Fn extends (payload: infer P) => any
    ? P
    : never
  : never;

export type CallInput<T extends AppRoute> = [ExtractPreprocessInput<T>] extends [never]
  ? FullPayload<T>
  : ExtractPreprocessInput<T>;

export type FullPayload<T extends AppRoute> = (T extends { query: infer Q } ? { query: Q } : {}) &
  (T extends { body: infer B } ? { body: B } : {}) &
  (T extends { headers: infer H } ? { headers: H } : {}) &
  (T extends { pathParams: infer P } ? { pathParams: P } : {});

export type IsObjectEmpty<T> = T extends Record<string, never> ? true : false;

export type CallPayloadArgs<T extends AppRoute> =
  IsObjectEmpty<CallInput<T>> extends true ? [payload?: undefined] : [payload: CallInput<T>];

/** defineExtraProps 允许注入的额外配置 */
export type RouteExtraCommon = {
  _presetAxiosConfig?: AxiosRequestConfig;
  _axiosInstance?: string;
};

export type RouteExtraPropsWithoutPreprocess = RouteExtraCommon & {
  _payloadPreprocess?: never;
};

export type RouteExtraPropsWithPreprocess<T extends AppRoute, P> = RouteExtraCommon & {
  _payloadPreprocess: (payload: P) => FullPayload<T>;
};

export type RouteExtraProps<T extends AppRoute, P = never> = [P] extends [never]
  ? RouteExtraPropsWithoutPreprocess
  : RouteExtraPropsWithPreprocess<T, P>;

type RouteExtraKeys = keyof RouteExtraProps<AppRoute, any>;

/** 普通路由，禁止写 extra 字段 */
export type RawRoute<T extends AppRoute> = T & {
  [K in RouteExtraKeys]?: never;
};

export type ExtendedRoute<T extends AppRoute, P> = T &
  RouteExtraProps<T, P> & {
    readonly [PROCESS_BRAND]: P;
  };

export type AnyExtendedRoute = ExtendedRoute<AppRoute, never> | ExtendedRoute<AppRoute, any>;

export type ApiModuleValid = {
  [functionName: string]: RawRoute<AppRoute> | AnyExtendedRoute;
};

export type ApiContractValid = {
  [moduleName: string]: ApiModuleValid;
};
