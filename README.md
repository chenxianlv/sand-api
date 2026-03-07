# sand-api

## 简介

`sand-api` 是一个基于 **TypeScript 类型优先 (Type-First)** 理念的 API 合约与网络请求库。

在传统的 “OpenAPI-first” 工作流中（维护接口文档 -> 生成 TS 类型 -> 适配业务代码），前端通常处于被动接收状态。

使用 `sand-api` 后，开发者只需维护一份 TS 合约，即可派生类型安全的调用代码及接口文档。

**这个库的特点：**

- TypeScript 类型定义是单一事实来源，接口调用类型和接口描述都围绕这份定义展开。
- 调用代码直接从 TS contract 推导出来，不需要额外经过“文档 -> 代码生成类型 -> 再接入业务代码”的中间链路。
- 接口演进时优先修改 TS 类型定义，代码和文档能力都从这里继续向外派生，而不是反过来被文档驱动。

**这个库主要解决传统前端开发中的这些痛点：**

- 常见 OpenAPI-first 流程里，接口文档比 TS 类型更难修改，定义调整成本高。
- 文档改完之后还需要重新生成一遍类型，才能让代码重新适配，链路长而且繁琐。
- 文档、生成类型、请求封装、业务调用分散在多个环节维护，任何一步滞后都会产生不一致。
- 前端在本地快速试验或迭代接口时，往往要先改文档再等生成结果，开发节奏被工具链反向约束。

## 使用手册

以下示例均截取自 `demo` 目录，和当前仓库实现保持一致。

### 基础定义：定义接口模块

`demo/api/modules/Sample.ts`

```ts
import { ApiHelper, type ApiModuleValid } from 'sand-api';

/**
 * 辅助定义类型，用于同时提供静态类型和动态类型标识，需要保证传入的字符串是泛型类型名
 * 所有传递给 t 函数的类型都要使用 export 导出，供 Node.js 运行时解析使用
 * @sample t<SamplePostQuery>('SamplePostQuery')
 */
const { t } = ApiHelper;

export default {
  // 接口定义，属性名即为接口调用名
  samplePost: {
    /**
     * 请求方法：'GET' | 'POST' | 'DELETE' | 'PUT' | 'PATCH'
     */
    method: 'POST',
    /**
     * 请求路径，支持路径参数，用 {} 包裹路径参数变量，路径参数要同时定义在 pathParams 中
     */
    path: '/sampleService/query/{sampleId}',
    /**
     * query 参数定义，即 ?sampleQuery=xx
     */
    query: t<SamplePostQuery>('SamplePostQuery'),
    /**
     * 路径参数定义，'/xxx/{id}/xx' => '/xxx/123/xx'
     */
    pathParams: t<SamplePostPathParams>('SamplePostPathParams'),
    /**
     * 请求头定义
     */
    headers: t<SamplePostHeaders>('SamplePostHeaders'),
    /**
     * 请求体定义
     */
    body: t<SamplePostBody>('SamplePostBody'),
    /**
     * 响应定义
     */
    responses: {
      200: t<SamplePostResponse>('SamplePostResponse'),
    },
  },
} as const satisfies ApiModuleValid;

// 相关类型建议定义在模块对象下面
export interface SamplePostQuery {
  sampleQuery: string;
}

export interface SamplePostPathParams {
  sampleId: string;
}

export interface SamplePostHeaders {
  sampleHeader: string;
}

export interface SamplePostBody {
  sampleBody: string;
}

export interface SamplePostResponse {
  sampleResponse: string;
}
```

说明：

- `t<T>('TypeName')` 会同时保留 TS 泛型信息和运行时类型名，因此传给 `t` 的类型需要使用 `export` 导出。

### 组装 API Contract

`demo/api/contract.ts`

```ts
import type { ApiContractValid } from 'sand-api';
import Sample from './modules/Sample';

export const apiContract = {
  Sample,
} as const satisfies ApiContractValid;
```

### 准备 Axios 实例并创建 API

`demo/api/instances/baseInstance.ts`

```ts
import axios from 'axios';

const instance = axios.create({
  baseURL: 'http://127.0.0.1:3001',
  timeout: 3000,
  headers: {
    'X-Demo-Instance': 'base',
  },
});

export default instance;
```

`demo/api/index.ts`

```ts
import { createApi } from 'sand-api';
import { apiContract } from './contract';

export const Api = createApi({
  contract: apiContract,
  axiosInstanceLoadMap: {
    base: () => import('./instances/baseInstance').then(m => m.default),
    reporting: () => import('./instances/reportingInstance').then(m => m.default),
  },
});
```

### 常规调用

`demo/use.ts`

```ts
const samplePayload = {
  pathParams: {
    sampleId: '1',
  },
  query: {
    sampleQuery: '2',
  },
  headers: {
    sampleHeader: '3',
  },
  body: {
    sampleBody: '4',
  },
};

const normalRes = await Api.Sample.samplePost(samplePayload);

const fullResponse = await Api.Sample.samplePost(samplePayload, {
  fullResponse: true,
});

const withAxiosConfigRes = await Api.Sample.samplePost(samplePayload, {
  axiosConfig: {
    timeout: 5000,
    headers: {
      'X-From-Call': 'with-axios-config',
    },
  },
  fullResponse: true,
});

await Api.Sample.samplePost(samplePayload, {
  axiosInstance: 'reporting',
});
```

上面这段会自动获得这些类型能力：

- `samplePayload` 的结构必须和接口定义一致。
- `normalRes` 会被推导为 `SamplePostResponse`。
- `fullResponse: true` 时，返回值会切换为 `AxiosResponse<SamplePostResponse>`。

### 上传能力

`demo/use.ts`

```ts
await Api.Sample.storeImage({
  body: new Blob(['binary-image-content'], {
    type: 'application/octet-stream',
  }),
});

await Api.Sample.submitForm({
  body: {
    content: new File(['face-image-content'], 'face.jpg', { type: 'image/jpeg' }),
    name: 'john',
  },
});
```

对应的接口定义已经在 `demo/api/modules/Sample.ts` 中声明了 `contentType`，调用侧只需要传入符合类型的 `body` 即可。

### 调用时能力增强

`defineExtraProps(route, extra)` 用来给某个路由补充调用时能力，但不会改掉原始路由的核心定义。它主要暴露三个字段：

- `_payloadPreprocess`：在发送请求前对调用入参做转换。
- `_presetAxiosConfig`：给某个接口预设默认 Axios 配置。
- `_axiosInstance`：给某个接口指定默认 Axios 实例。

下面的定义片段来自 `demo/api/modules/Sample.ts`，默认已包含 `const { t, defineExtraProps } = ApiHelper;`。

#### `_payloadPreprocess`

`_payloadPreprocess` 负责把“业务侧更顺手的输入”转换成“接口真实需要的 payload 结构”。

这个函数有两个核心规则：

- 返回值必须满足该接口原始 payload 结构。
- 入参类型可以自定义，接口调用时暴露给业务代码的就是这个自定义入参类型。

`demo` 里给了几个常见用法。

##### 简化调用入参

适合“接口实际需要的是字符串，但业务侧天然拿到的是数组”这类场景。

定义示例，来自 `demo/api/modules/Sample.ts`：

```ts
deleteUsers: defineExtraProps(
  {
    method: 'DELETE',
    path: '/sampleService/user',
    query: t<DeleteUsersQuery>('DeleteUsersQuery'),
  },
  {
    _payloadPreprocess(userIds: string[]) {
      return {
        query: {
          user_ids: userIds.join(','),
        },
      };
    },
  },
),

export interface DeleteUsersQuery {
  user_ids: string;
}
```

调用示例，来自 `demo/use.ts`：

```ts
const deleteUsersRes = await Api.Sample.deleteUsers(['1001', '1002', '1003']);
```

核心逻辑：

- 原始接口定义要求的其实是 `{ query: { user_ids: string } }`。
- 经过 `_payloadPreprocess` 之后，调用侧直接传 `string[]` 就可以了。

##### 转换成接口要求的特殊格式

适合“业务侧输入结构更自然，但接口要求的 header/body 格式比较奇怪”这类场景。

定义示例，来自 `demo/api/modules/Sample.ts`：

```ts
nonstandardQuery: defineExtraProps(
  {
    method: 'POST',
    path: '/sampleService/list',
    headers: t<NonstandardQueryHeaders>('NonstandardQueryHeaders'),
    body: t<NonstandardQueryBody>('NonstandardQueryBody'),
  },
  {
    _payloadPreprocess: (payload: {
      body: NonstandardQueryBody;
      headers: {
        id: string;
        name: string;
      };
    }) => {
      return {
        ...payload,
        headers: {
          'Custom-UserInfo': `id=${payload.headers.id},name=${payload.headers.name}`,
        },
      };
    },
  },
),

export interface NonstandardQueryBody {
  page: number;
  size: number;
}

export interface NonstandardQueryHeaders {
  'Custom-UserInfo': string;
}
```

调用示例，来自 `demo/use.ts`：

```ts
const nonstandardQueryRes = await Api.Sample.nonstandardQuery({
  body: {
    page: 1,
    size: 3,
  },
  headers: {
    id: 'u-001',
    name: 'demo-user',
  },
});
```

核心逻辑：

- 调用侧传入更容易理解的 `{ id, name }`。
- 真正发送请求时，会被统一转换成接口要求的 `'Custom-UserInfo'` 字符串。

##### 为请求体补默认值

适合“业务侧可以少传一部分字段，但真正发请求时需要补齐默认值”这类场景。

定义示例，来自 `demo/api/modules/Sample.ts`：

```ts
registerUser: defineExtraProps(
  {
    method: 'POST',
    path: '/sampleService/user/register',
    body: t<RegisterUserBody>('RegisterUserBody'),
  },
  {
    _payloadPreprocess: (payload: {
      body: Omit<RegisterUserBody, 'locale'> & Partial<Pick<RegisterUserBody, 'locale'>>;
    }) => {
      const defaultBody: Pick<RegisterUserBody, 'locale'> = {
        locale: typeof navigator === 'undefined' ? 'en-US' : navigator.language,
      };
      return {
        body: { ...defaultBody, ...payload.body },
      };
    },
  },
),

export interface RegisterUserBody {
  name: string;
  locale: string;
}
```

调用示例，来自 `demo/use.ts`：

```ts
const registerUserRes = await Api.Sample.registerUser({
  body: {
    name: 'Alice',
  },
});
```

核心逻辑：

- 原始接口要求 `locale` 必填。
- 调用侧可以只传 `name`，`_payloadPreprocess` 会在发送前自动补上默认 `locale`。

#### `_presetAxiosConfig`

`_presetAxiosConfig` 用来给某个接口绑定默认 Axios 配置，适合“只有这个接口需要特殊 `paramsSerializer`、超时、重试配置”这类场景。

定义示例，来自 `demo/api/modules/Sample.ts`：

```ts
deleteUsersWithCustomAxiosConfig: defineExtraProps(
  {
    method: 'DELETE',
    path: '/sampleService/user',
    query: t<DeleteUsersQuery>('DeleteUsersQuery'),
  },
  {
    _presetAxiosConfig: {
      // 工具函数：不进行 encode 的 paramsSerializer
      paramsSerializer: paramsSerializerWithoutEncode,
    },
  },
),
```

调用示例，来自 `demo/use.ts`：

```ts
const deleteUsersWithCustomAxiosConfigRes = await Api.Sample.deleteUsersWithCustomAxiosConfig({
  query: {
    user_ids: '1001+1002/1003',
  },
});
// 若不指定 paramsSerializer，发送的 uri: /sampleService/user?user_ids=1001%2B1002%2F1003
// 实际发送的 uri: /sampleService/user?user_ids=1001+1002/1003
```

核心逻辑：

- 这个接口在定义阶段就带上了默认 Axios 配置。
- 如果调用时再传 `axiosConfig`，会以调用时传入的配置为准覆盖默认配置。

#### `_axiosInstance`

`_axiosInstance` 用来给某个接口指定默认 Axios 实例，适合“这个接口天然属于另一个服务域，应该默认走另一个 Axios 实例”这类场景。

定义示例，来自 `demo/api/modules/Sample.ts`：

```ts
registerUserWithAnotherInstance: defineExtraProps(
  {
    method: 'POST',
    path: '/sampleService/user/register',
    body: t<RegisterUserBody>('RegisterUserBody'),
  },
  {
    _axiosInstance: 'reporting',
  },
),
```

调用示例，来自 `demo/use.ts`：

```ts
await Api.Sample.registerUserWithAnotherInstance({
  body: {
    name: 'Alice',
    locale: 'zh-CN',
  },
});
```

核心逻辑：

- 这个接口默认会走 `reporting` 实例。
- 如果调用时显式传了 `axiosInstance`，会覆盖这里的默认实例。

## Roadmap

当前状态：核心部分已经完成，包含接口定义与类型安全调用两大主线。

- [x] 基于 TypeScript 类型定义 API contract、module 和 route
- [x] 根据 contract 生成类型安全的调用对象
- [x] 支持 `pathParams`、`query`、`headers`、`body`、`responses` 的完整类型推导
- [x] 支持二进制上传、表单上传
- [x] 支持 `defineExtraProps` 做请求预处理、默认值注入和调用参数重塑
- [x] 支持按接口或按调用切换 Axios 实例、注入额外 Axios 配置
- [ ] 根据接口定义生成 OpenAPI 文档
- [ ] 基于 OpenAPI 文档启动 Swagger 在线文档
- [ ] 请求聚合功能
