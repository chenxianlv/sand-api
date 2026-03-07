import type { AxiosInstance, AxiosResponse, AxiosRequestConfig } from 'axios';
import { executeApiRoute } from './request';
import type { ApiContractValid, AppRoute, CallPayloadArgs, ExtendedRoute } from './type';

export interface ApiCallOptions<AxiosInstanceLoadMap extends AxiosInstanceLoadMapValid> {
  /** 传递给 axios 的额外配置 */
  axiosConfig?: AxiosRequestConfig;
  /** 是否返回完整的 AxiosResponse 对象 */
  fullResponse?: boolean;
  /** 指定要使用的 axios 实例 */
  axiosInstance?: keyof AxiosInstanceLoadMap;
}

export interface ApiInitOptions<
  Contract extends ApiContractValid,
  AxiosInstanceLoadMap extends AxiosInstanceLoadMapValid,
> {
  /** API 合约 */
  contract: Contract;
  /** Axios 实例加载器 */
  axiosInstanceLoadMap: AxiosInstanceLoadMap;
  /** 默认的 axios 实例，默认为 base */
  defaultAxiosInstance?: keyof AxiosInstanceLoadMap;
  /**
   * 是否在初始化时加载默认 axios 实例
   * @default true
   */
  loadDefaultInstanceInInit?: boolean;
}

class API<Contract extends ApiContractValid, AxiosInstanceLoadMap extends AxiosInstanceLoadMapValid> {
  constructor(options: ApiInitOptions<Contract, AxiosInstanceLoadMap>) {
    this.contract = options.contract;
    this.defaultAxiosInstance = options.defaultAxiosInstance || 'base';
    this.axiosInstanceLoadMap = options.axiosInstanceLoadMap;
    this.moduleNameSet = new Set(Object.keys(options.contract));

    this.apiInstance = this.createApiProxy();
    if (options.loadDefaultInstanceInInit !== false) {
      this.getAxiosInstance(this.defaultAxiosInstance);
    }
  }

  apiInstance: ApiProxy<Contract, AxiosInstanceLoadMap>;

  protected defaultAxiosInstance: keyof AxiosInstanceLoadMap;

  protected contract: Contract;

  protected axiosInstanceLoadMap: AxiosInstanceLoadMap;

  protected axiosInstanceMap: Map<keyof AxiosInstanceLoadMap, AxiosInstance> = new Map();

  protected axiosInstanceLoadingPromiseMap: Map<keyof AxiosInstanceLoadMap, Promise<AxiosInstance>> = new Map();

  protected moduleProxyCache = new Map<keyof Contract, any>();

  protected moduleNameSet: Set<string>;

  protected axiosInstance?: AxiosInstance;

  protected createApiProxy() {
    return new Proxy({} as ApiProxy<Contract, AxiosInstanceLoadMap>, {
      get: (_, moduleName) => {
        if (typeof moduleName === 'string') {
          if (this.moduleNameSet.has(moduleName)) {
            if (!this.moduleProxyCache.has(moduleName)) {
              this.moduleProxyCache.set(moduleName, this.createModuleProxy(moduleName));
            }
            return this.moduleProxyCache.get(moduleName);
          }
        }

        console.error(
          `API: Module not found, please check module config.\nTarget Module: ${String(moduleName)}\nAvailable Modules: ${Object.keys(this.contract).join(', ')}\n`,
        );
        return undefined;
      },
    });
  }

  protected createModuleProxy(moduleName: string) {
    return new Proxy({} as any, {
      get: (_, functionName: string) => {
        return async (...args: any[]) => {
          const routeObj = this.contract[moduleName]?.[functionName] as ExtendedRoute<AppRoute, any> | undefined;

          if (!routeObj) {
            throw new Error(`API: Function not found: ${moduleName}[${functionName}]`);
          }
          const payload = args[0];
          const finalPayload = routeObj._payloadPreprocess ? routeObj._payloadPreprocess(payload) : payload;
          const callOptions: ApiCallOptions<AxiosInstanceLoadMap> | undefined = args[1];
          const axiosOptions = { ...routeObj._presetAxiosConfig, ...callOptions?.axiosConfig };
          const axiosInstanceKey = callOptions?.axiosInstance || routeObj?._axiosInstance || this.defaultAxiosInstance;

          let axiosInstance = this.getAxiosInstance(axiosInstanceKey);
          if (axiosInstance instanceof Promise) {
            axiosInstance = await axiosInstance;
          }

          const res: AxiosResponse = await executeApiRoute(axiosInstance, routeObj, finalPayload, axiosOptions);
          return callOptions?.fullResponse ? res : res.data;
        };
      },
    });
  }

  protected getAxiosInstance(key: keyof AxiosInstanceLoadMap): AxiosInstance | Promise<AxiosInstance> {
    const instance = this.axiosInstanceMap.get(key);
    if (instance) {
      return instance;
    }

    const loadingPromise = this.axiosInstanceLoadingPromiseMap.get(key);
    if (loadingPromise) {
      return loadingPromise;
    }

    const instanceLoadFunc = this.axiosInstanceLoadMap[key];
    if (!instanceLoadFunc) {
      throw new Error(`API: Axios instance loader not found: ${String(key)}`);
    }

    const promise = new Promise<AxiosInstance>((resolve, reject) => {
      instanceLoadFunc()
        .then(instance => {
          this.axiosInstanceMap.set(key, instance);
          resolve(instance);
        })
        .catch(error => {
          reject(error);
        })
        .finally(() => {
          this.axiosInstanceLoadingPromiseMap.delete(key);
        });
    });

    this.axiosInstanceLoadingPromiseMap.set(key, promise);
    return promise;
  }
}

export function createApi<Contract extends ApiContractValid, AxiosInstanceLoadMap extends AxiosInstanceLoadMapValid>(
  options: ApiInitOptions<Contract, AxiosInstanceLoadMap>,
) {
  const api = new API(options);
  return api.apiInstance;
}

export type ApiProxy<Contract extends ApiContractValid, AxiosInstanceLoadMap extends AxiosInstanceLoadMapValid> = {
  [Service in keyof Contract]: {
    [Fn in keyof Contract[Service]]: ApiRequestFunction<Contract[Service][Fn], AxiosInstanceLoadMap>;
  };
};

type Success200Response<T extends AppRoute> =
  T['responses'] extends Record<number, any> ? (200 extends keyof T['responses'] ? T['responses'][200] : never) : never;

export type ApiRequestFunction<T extends AppRoute, AxiosInstanceLoadMap extends AxiosInstanceLoadMapValid> = <
  IsFullResponse extends boolean = false,
>(
  ...args: [
    ...CallPayloadArgs<T>,
    options?: Omit<ApiCallOptions<AxiosInstanceLoadMap>, 'fullResponse'> & { fullResponse?: IsFullResponse },
  ]
) => Promise<IsFullResponse extends true ? AxiosResponse<Success200Response<T>> : Success200Response<T>>;

export type AxiosInstanceLoadMapValid = {
  base: () => Promise<AxiosInstance>;
} & {
  [key: string]: () => Promise<AxiosInstance>;
};
