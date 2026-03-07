import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import type { AppRoute } from './type';

function replacePathParams(path: string, pathParams?: Record<string, any>): string {
  if (!pathParams) return path;
  return Object.entries(pathParams).reduce((acc, [key, value]) => {
    return acc.replace(`{${key}}`, encodeURIComponent(String(value)));
  }, path);
}

function toFormData(data: Record<string, any>): FormData {
  const formData = new FormData();

  Object.entries(data).forEach(([key, value]) => {
    // 跳过 undefined 和 null
    if (value === undefined || value === null) {
      return;
    }

    // 禁止函数或 Symbol 类型
    const valueType = typeof value;
    if (valueType === 'function' || valueType === 'symbol') {
      console.warn(`Unsupported data type for form field '${key}': ${valueType}`);
      return;
    }

    // Date -> ISO 字符串
    if (value instanceof Date) {
      formData.append(key, value.toISOString());
      return;
    }

    // File 或 Blob
    if (value instanceof File) {
      formData.append(key, value, value.name);
      return;
    }
    if (value instanceof Blob) {
      formData.append(key, value);
      return;
    }

    // 对象或数组，序列化为 JSON Blob
    if (typeof value === 'object') {
      const blob = new Blob([JSON.stringify(value)], { type: 'application/json' });
      formData.append(key, blob);
      return;
    }

    // 基本类型 转为字符串
    formData.append(key, String(value));
  });

  return formData;
}

export function buildAxiosConfig(route: AppRoute, payload: any, extra?: AxiosRequestConfig): AxiosRequestConfig {
  const method = route.method.toLowerCase() as AxiosRequestConfig['method'];
  const url = replacePathParams(route.path, payload?.pathParams);
  const headers = { ...(payload?.headers || {}), ...(extra?.headers || {}) } as Record<string, any>;
  const params = payload?.query;
  const { headers: _extraHeaders, ...extraConfig } = extra || {};

  let data: any;
  // 只有在定义了 body 时才组装请求体
  if ('body' in route && payload?.body !== undefined) {
    if ((route as any).contentType === 'multipart/form-data') {
      data = toFormData(payload.body);
      headers['Content-Type'] = 'multipart/form-data';
    } else if ((route as any).contentType === 'application/octet-stream') {
      data = payload.body;
      headers['Content-Type'] = headers['Content-Type'] || 'application/octet-stream';
    } else if ((route as any).contentType === 'application/x-www-form-urlencoded') {
      const usp = new URLSearchParams();
      Object.entries(payload.body).forEach(([k, v]) => {
        if (v !== undefined && v !== null) usp.append(k, String(v));
      });
      data = usp;
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    } else {
      data = payload.body;
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }
  }

  const config: AxiosRequestConfig = {
    method,
    url,
    params,
    data,
    headers,
    ...extraConfig,
  };

  return config;
}

export async function executeApiRoute(
  axios: AxiosInstance,
  route: AppRoute,
  payload: any,
  axiosOptions?: AxiosRequestConfig,
): Promise<AxiosResponse> {
  const config = buildAxiosConfig(route, payload, axiosOptions);
  return await axios.request(config);
}
