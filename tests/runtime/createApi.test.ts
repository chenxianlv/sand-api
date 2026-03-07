import axios from 'axios';
import { createApi } from 'sand-api';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiContract } from './fixtures/contract';
import type { TestPreprocessInput } from './fixtures/modules/Test';

function createAxiosLike(name: string) {
  return {
    request: vi.fn(async (config: any) => {
      return {
        data: {
          rtn: 0,
          updated: true,
          success: true,
          items: [{ id: name }],
        },
        status: 200,
        statusText: 'OK',
        headers: { 'x-instance': name },
        config,
      };
    }),
  };
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>(r => {
    resolve = r;
  });
  return { promise, resolve };
}

function createTestApi(options?: {
  baseInstance?: ReturnType<typeof createAxiosLike>;
  reportingInstance?: ReturnType<typeof createAxiosLike>;
  baseLoader?: () => Promise<any>;
  reportingLoader?: () => Promise<any>;
  defaultAxiosInstance?: 'base' | 'reporting';
  loadDefaultInstanceInInit?: boolean;
}) {
  const baseInstance = options?.baseInstance ?? createAxiosLike('base');
  const reportingInstance = options?.reportingInstance ?? createAxiosLike('reporting');
  const baseLoader = vi.fn(options?.baseLoader ?? (async () => baseInstance as any));
  const reportingLoader = vi.fn(options?.reportingLoader ?? (async () => reportingInstance as any));

  const api = createApi({
    contract: apiContract,
    axiosInstanceLoadMap: {
      base: baseLoader,
      reporting: reportingLoader,
    },
    defaultAxiosInstance: options?.defaultAxiosInstance,
    loadDefaultInstanceInInit: options?.loadDefaultInstanceInInit,
  });

  return {
    api,
    baseInstance,
    reportingInstance,
    loaders: {
      base: baseLoader,
      reporting: reportingLoader,
    },
  };
}

describe('src/Api', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('应缓存同一模块的代理对象', () => {
    const { api } = createTestApi();

    expect(api.Test).toBe(api.Test);
  });

  it('未知模块应返回 undefined 并打印错误日志', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { api } = createTestApi();

    expect((api as any).UnknownModule).toBeUndefined();
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0]?.[0]).toContain('API: Module not found');
  });

  it('默认会在初始化时预加载默认 axios 实例', () => {
    const { loaders } = createTestApi();

    expect(loaders.base).toHaveBeenCalledTimes(1);
    expect(loaders.reporting).not.toHaveBeenCalled();
  });

  it('loadDefaultInstanceInInit=false 时应延迟加载默认实例', async () => {
    const { api, loaders } = createTestApi({
      loadDefaultInstanceInInit: false,
    });

    expect(loaders.base).not.toHaveBeenCalled();

    await api.Test.getList({
      query: { page: 1 },
    });

    expect(loaders.base).toHaveBeenCalledTimes(1);
  });

  it('默认应使用 base 实例，并返回 res.data', async () => {
    const { api, baseInstance, reportingInstance } = createTestApi();

    const result = await api.Test.getList({
      query: { page: 1, keyword: 'k' },
    });

    expect(result).toEqual({
      rtn: 0,
      updated: true,
      success: true,
      items: [{ id: 'base' }],
    });
    expect(baseInstance.request).toHaveBeenCalledTimes(1);
    expect(reportingInstance.request).not.toHaveBeenCalled();
    expect(baseInstance.request).toHaveBeenCalledWith({
      method: 'get',
      url: '/test/list',
      params: { page: 1, keyword: 'k' },
      data: undefined,
      headers: {},
    });
  });

  it('fullResponse=true 时应返回完整 AxiosResponse', async () => {
    const { api } = createTestApi();

    const response = await api.Test.getList(
      {
        query: { page: 1 },
      },
      {
        fullResponse: true,
      },
    );

    expect(response.status).toBe(200);
    expect(response.data.items).toEqual([{ id: 'base' }]);
    expect(response.headers['x-instance']).toBe('base');
  });

  it('应执行 _payloadPreprocess 处理后的 payload', async () => {
    const { api, baseInstance } = createTestApi();
    const payload: TestPreprocessInput = {
      basePath: '/gateway',
      token: 'token-1',
      payload: {
        value: 'hello',
      },
    };

    await api.Test.submitWithPreprocess(payload);

    expect(baseInstance.request).toHaveBeenCalledWith({
      method: 'post',
      url: '/gateway/submit',
      params: undefined,
      data: { value: 'hello' },
      headers: {
        Authorization: 'Bearer token-1',
        'Content-Type': 'application/json',
      },
    });
  });

  it('应带上 _presetAxiosConfig，且支持调用方 axiosConfig 覆盖', async () => {
    const { api, baseInstance } = createTestApi();

    await api.Test.updateItem({
      pathParams: { id: '1' },
      body: { name: 'n1' },
    });

    expect(baseInstance.request).toHaveBeenNthCalledWith(1, {
      method: 'put',
      url: '/test/item/1',
      params: undefined,
      data: { name: 'n1' },
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 1000,
    });

    await api.Test.updateItem(
      {
        pathParams: { id: '2' },
        body: { name: 'n2' },
      },
      {
        axiosConfig: {
          timeout: 1500,
          withCredentials: true,
        },
      },
    );

    expect(baseInstance.request).toHaveBeenNthCalledWith(2, {
      method: 'put',
      url: '/test/item/2',
      params: undefined,
      data: { name: 'n2' },
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 1500,
      withCredentials: true,
    });
  });

  it('支持 application/octet-stream 二进制上传', async () => {
    const { api, baseInstance } = createTestApi();
    const body = new Blob(['binary-image-content'], {
      type: 'application/octet-stream',
    });

    const response = await api.Test.uploadBinary(
      {
        body,
      },
      {
        fullResponse: true,
      },
    );

    expect(response.config.data).toBe(body);
    expect(response.config.headers['Content-Type']).toBe('application/octet-stream');
    expect(baseInstance.request).toHaveBeenCalledTimes(1);
  });

  it('支持 multipart/form-data 表单上传', async () => {
    const { api, baseInstance } = createTestApi();
    const content = new File(['face-image-content'], 'face.jpg', { type: 'image/jpeg' });

    const response = await api.Test.submitForm(
      {
        body: {
          content,
          name: 'john',
        },
      },
      {
        fullResponse: true,
      },
    );

    expect(response.config.headers['Content-Type']).toBe('multipart/form-data');
    expect(response.config.data).toBeInstanceOf(FormData);
    const formData = response.config.data as FormData;
    expect(formData.get('name')).toBe('john');

    const file = formData.get('content') as File;
    expect(file.name).toBe('face.jpg');
    expect(baseInstance.request).toHaveBeenCalledTimes(1);
  });

  it('支持 defineExtraProps 简化参数传递', async () => {
    const { api } = createTestApi();

    const response = await api.Test.deleteUsers(['1001', '1002', '1003'], {
      fullResponse: true,
    });

    expect(response.config.params).toEqual({
      user_ids: '1001,1002,1003',
    });
  });

  it('支持 defineExtraProps 组装特殊 headers', async () => {
    const { api } = createTestApi();

    const response = await api.Test.nonstandardQuery(
      {
        body: {
          page: 1,
          size: 3,
        },
        headers: {
          id: 'u-001',
          name: 'test-user',
        },
      },
      { fullResponse: true },
    );

    expect(response.config.headers['Custom-UserInfo']).toBe('id=u-001,name=test-user');
    expect(response.config.data).toEqual({
      page: 1,
      size: 3,
    });
  });

  it('支持 defineExtraProps 注入默认值', async () => {
    vi.stubGlobal('navigator', {
      language: 'zh-CN',
    });
    const { api } = createTestApi();

    const response = await api.Test.registerUser(
      {
        body: {
          name: 'Alice',
        },
      },
      { fullResponse: true },
    );

    expect(response.config.data).toEqual({
      name: 'Alice',
      locale: 'zh-CN',
    });
  });

  it('接口定义中的 paramsSerializer 应透传给 axios 配置', async () => {
    const { api } = createTestApi();

    const response = await api.Test.deleteUsersWithCustomAxiosConfig(
      {
        query: {
          user_ids: '1001+1002/1003',
        },
      },
      { fullResponse: true },
    );

    expect(axios.getUri(response.config)).toBe('/test/user?user_ids=1001+1002/1003');
  });

  it('接口定义中的 _axiosInstance 应使用对应实例', async () => {
    const { api, baseInstance, reportingInstance } = createTestApi();

    await api.Test.registerUserWithAnotherInstance({
      body: {
        name: 'Alice',
        locale: 'zh-CN',
      },
    });

    expect(reportingInstance.request).toHaveBeenCalledTimes(1);
    expect(baseInstance.request).not.toHaveBeenCalled();
  });

  it('调用方传入 axiosInstance 应覆盖接口定义中的实例', async () => {
    const { api, baseInstance, reportingInstance } = createTestApi();

    await api.Test.registerUserWithAnotherInstance(
      {
        body: {
          name: 'Alice',
          locale: 'zh-CN',
        },
      },
      {
        axiosInstance: 'base',
      },
    );

    expect(baseInstance.request).toHaveBeenCalledTimes(1);
    expect(reportingInstance.request).not.toHaveBeenCalled();
  });

  it('defaultAxiosInstance 可切换为其他实例', async () => {
    const { api, baseInstance, reportingInstance, loaders } = createTestApi({
      defaultAxiosInstance: 'reporting',
      loadDefaultInstanceInInit: false,
    });

    await api.Test.getList({
      query: { page: 2 },
    });

    expect(loaders.reporting).toHaveBeenCalledTimes(1);
    expect(reportingInstance.request).toHaveBeenCalledTimes(1);
    expect(baseInstance.request).not.toHaveBeenCalled();
  });

  it('并发请求同一实例时应复用加载中的 Promise', async () => {
    const baseInstance = createAxiosLike('base');
    const loading = deferred<any>();
    const { api, loaders } = createTestApi({
      baseInstance,
      baseLoader: () => loading.promise,
      loadDefaultInstanceInInit: false,
    });

    const request1 = api.Test.getList({
      query: { page: 1 },
    });
    const request2 = api.Test.getList({
      query: { page: 2 },
    });

    expect(loaders.base).toHaveBeenCalledTimes(1);

    loading.resolve(baseInstance as any);
    await Promise.all([request1, request2]);

    expect(baseInstance.request).toHaveBeenCalledTimes(2);
  });

  it('未知 axios 实例应抛错', async () => {
    const { api } = createTestApi({
      loadDefaultInstanceInInit: false,
    });

    await expect(
      api.Test.getList(
        {
          query: { page: 1 },
        },
        {
          axiosInstance: 'missing' as any,
        },
      ),
    ).rejects.toThrow('API: Axios instance loader not found: missing');
  });

  it('未知函数应抛错', async () => {
    const { api } = createTestApi({
      loadDefaultInstanceInInit: false,
    });

    await expect((api.Test as any).__not_exists__()).rejects.toThrow('API: Function not found: Test[__not_exists__]');
  });
});
