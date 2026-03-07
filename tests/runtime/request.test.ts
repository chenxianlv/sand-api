import type { AppRoute } from 'sand-api';
import { describe, expect, it, vi } from 'vitest';
import { buildAxiosConfig, executeApiRoute } from '../../src/request';

describe('src/request', () => {
  it('buildAxiosConfig: 组装 GET 请求并合并 payload/extra headers', () => {
    const route: AppRoute = {
      method: 'GET',
      path: '/users/{id}',
      responses: { 200: {} },
    };

    const config = buildAxiosConfig(
      route,
      {
        pathParams: { id: 'a/b' },
        query: { page: 1 },
        headers: { 'X-Token': 'payload', 'X-Shared': 'payload' },
      },
      {
        headers: { 'X-Shared': 'extra', 'X-Trace-Id': 'trace' },
        timeout: 5000,
      },
    );

    expect(config.method).toBe('get');
    expect(config.url).toBe('/users/a%2Fb');
    expect(config.params).toEqual({ page: 1 });
    expect(config.data).toBeUndefined();
    expect(config.timeout).toBe(5000);
    expect(config.headers).toEqual({
      'X-Token': 'payload',
      'X-Shared': 'extra',
      'X-Trace-Id': 'trace',
    });
  });

  it('buildAxiosConfig: JSON body 默认设置 Content-Type', () => {
    const route: AppRoute = {
      method: 'POST',
      path: '/submit',
      body: {},
      responses: { 200: {} },
    };

    const config = buildAxiosConfig(route, { body: { name: 'api' } });

    expect(config.data).toEqual({ name: 'api' });
    expect((config.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('buildAxiosConfig: 已有 Content-Type 时不覆盖 JSON 请求头', () => {
    const route: AppRoute = {
      method: 'PUT',
      path: '/submit',
      body: {},
      responses: { 200: {} },
    };

    const config = buildAxiosConfig(
      route,
      {
        body: { name: 'api' },
      },
      {
        headers: {
          'Content-Type': 'application/custom+json',
        },
      },
    );

    expect((config.headers as Record<string, string>)['Content-Type']).toBe('application/custom+json');
  });

  it('buildAxiosConfig: multipart/form-data 支持多种字段并过滤非法值', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const route: AppRoute = {
      method: 'POST',
      path: '/upload',
      contentType: 'multipart/form-data',
      body: {},
      responses: { 200: {} },
    };

    const now = new Date('2026-03-03T00:00:00.000Z');
    const fileValue =
      typeof File === 'undefined' ? undefined : new File(['hello'], 'hello.txt', { type: 'text/plain' });

    const config = buildAxiosConfig(route, {
      body: {
        num: 1,
        text: 'ok',
        now,
        obj: { a: 1 },
        arr: [1, 2],
        file: fileValue,
        blob: new Blob(['blob-content'], { type: 'text/plain' }),
        undef: undefined,
        empty: null,
        fn: () => 'x',
        sym: Symbol('x'),
      },
    });

    expect((config.headers as Record<string, string>)['Content-Type']).toBe('multipart/form-data');
    expect(config.data).toBeInstanceOf(FormData);

    const formData = config.data as FormData;
    expect(formData.get('num')).toBe('1');
    expect(formData.get('text')).toBe('ok');
    expect(formData.get('now')).toBe(now.toISOString());

    const objBlob = formData.get('obj') as Blob;
    expect(objBlob).toBeInstanceOf(Blob);
    expect(await objBlob.text()).toBe('{"a":1}');

    const arrBlob = formData.get('arr') as Blob;
    expect(arrBlob).toBeInstanceOf(Blob);
    expect(await arrBlob.text()).toBe('[1,2]');

    const blob = formData.get('blob') as Blob;
    expect(blob).toBeInstanceOf(Blob);
    expect(await blob.text()).toBe('blob-content');

    if (fileValue) {
      const file = formData.get('file') as File;
      expect(file).toBeInstanceOf(File);
      expect(file.name).toBe('hello.txt');
    }

    expect(formData.get('undef')).toBeNull();
    expect(formData.get('empty')).toBeNull();
    expect(warnSpy).toHaveBeenCalledTimes(2);
  });

  it('buildAxiosConfig: application/x-www-form-urlencoded 正确编码且忽略空值', () => {
    const route: AppRoute = {
      method: 'POST',
      path: '/query',
      contentType: 'application/x-www-form-urlencoded',
      body: {},
      responses: { 200: {} },
    };

    const config = buildAxiosConfig(route, {
      body: {
        a: 1,
        b: null,
        c: undefined,
        d: 'hello world',
      },
    });

    expect((config.headers as Record<string, string>)['Content-Type']).toBe('application/x-www-form-urlencoded');
    expect(config.data).toBeInstanceOf(URLSearchParams);
    expect((config.data as URLSearchParams).toString()).toBe('a=1&d=hello+world');
  });

  it('buildAxiosConfig: application/octet-stream 透传二进制内容并设置请求头', async () => {
    const route: AppRoute = {
      method: 'POST',
      path: '/binary',
      contentType: 'application/octet-stream',
      body: {},
      responses: { 200: {} },
    };
    const body = new Blob(['binary-content'], { type: 'application/octet-stream' });

    const config = buildAxiosConfig(route, { body });

    expect(config.data).toBe(body);
    expect((config.headers as Record<string, string>)['Content-Type']).toBe('application/octet-stream');
    expect(await (config.data as Blob).text()).toBe('binary-content');
  });

  it('buildAxiosConfig: 路由未定义 body 时不组装 data', () => {
    const route: AppRoute = {
      method: 'GET',
      path: '/nobody',
      responses: { 200: {} },
    };

    const config = buildAxiosConfig(route, {
      body: { shouldNotSend: true },
    });

    expect(config.data).toBeUndefined();
  });

  it('executeApiRoute: 应调用 axios.request 并传入 buildAxiosConfig 结果', async () => {
    const route: AppRoute = {
      method: 'DELETE',
      path: '/items/{id}',
      pathParams: {},
      responses: { 200: {} },
    };

    const axiosInstance = {
      request: vi.fn().mockResolvedValue({ data: { ok: true } }),
    };

    await executeApiRoute(
      axiosInstance as any,
      route,
      {
        pathParams: { id: '123' },
        headers: { 'X-Test': '1' },
      },
      { timeout: 3000 },
    );

    expect(axiosInstance.request).toHaveBeenCalledTimes(1);
    expect(axiosInstance.request).toHaveBeenCalledWith({
      method: 'delete',
      url: '/items/123',
      params: undefined,
      data: undefined,
      headers: { 'X-Test': '1' },
      timeout: 3000,
    });
  });
});
