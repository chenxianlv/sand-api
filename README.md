# API 使用手册

## 1. 新增接口

### 1.1 新增模块文件

若要新增模块，在 `src/api/modules` 下新增模块文件（例如 `Sample.ts`）并导出模块对象。  
若只是在已有模块追加接口，则直接在该模块对象中增加属性即可。

```ts
import { ApiHelper, ApiModuleValid } from '@/api/_core/type';
import { PROXY_URI } from '@/constants/System';
import { IIdPathParams, IResponse } from '@/interface/baseCommon/Api';

/**
 * 辅助定义类型，用于同时提供静态类型和动态类型标识，需要保证传入的字符串是泛型类型名
 * 所有传递给 t 函数的类型都要使用 export 导出
 * @sample t<ISampleGetQuery>('ISampleGetQuery')
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
     * 请求路径，支持路径参数，用 {} 包裹路径参数变量，路径参数要定义同时在pathParams中
     */
    path: `${PROXY_URI.FP}/sample/query/{sampleId}/face`,
    /**
     * query参数定义，即 ?sampleQuery=xx
     */
    query: t<ISamplePostQuery>('ISamplePostQuery'),
    /**
     * 路径参数定义，'/xxx/{id}/xx' => '/xxx/123/xx'
     * 对于只有一个路径参数且参数名为id的情况，提供了一个预置类型 IIdPathParams ，可以直接引用
     * @sample t<IIdPathParams>('IIdPathParams')
     */
    pathParams: t<ISamplePostPathParams>('ISamplePostPathParams'),
    /**
     * 请求头定义
     */
    headers: t<ISamplePostHeaders>('ISamplePostHeaders'),
    /**
     * 请求体定义
     */
    body: t<ISamplePostBody>('ISamplePostBody'),
    /**
     * 响应定义
     */
    responses: {
      200: t<ISamplePostResponse>('ISamplePostResponse'),
    },
  },
} as const satisfies ApiModuleValid; // 提供类型支持

// 相关类型建议定义在模块对象下面

export interface ISamplePostQuery {
  sampleQuery: string;
}

export interface ISamplePostPathParams {
  sampleId: string;
}

export interface ISamplePostHeaders {
  sampleHeader: string;
}

export interface ISamplePostBody {
  sampleBody: string;
}

export interface ISamplePostResponse extends IResponse {
  sampleResponse: string;
}
```

说明：

- 传递给 `t` 的类型在整个项目范围内不能有重名类型，也不能是循环引用类型。

### 1.2 注册模块（仅新增模块时）

在 `src/api/contract.ts` 的 `baseContract` 中挂载模块：

```ts
import type { ApiContractValid } from './_core/type';
import sampleModule from './modules/Sample';

const baseContract = {
  // 模块名：模块对象
  Sample: sampleModule,
} as const satisfies ApiContractValid;
```

## 2. 表单与文件上传

### 2.1 二进制流上传（请求体仅文件）

```ts
  storeImage: {
    method: 'POST',
    path: `${URI.FP_STORAGE_V1}/image/global`,
    // 定义为二进制流
    contentType: 'application/octet-stream',
    // body指定为File或Blob
    body: t<File>('File'),
    responses: {
      200: t<IStoreImageResponse>('IStoreImageResponse'),
    },
  },
```

### 2.2 表单上传

```ts
batchUploadFace: {
  method: 'POST',
  path: `${PROXY_URI.FP}/website/face/v1/ImportImage`,
  /* contentType 可选值:
   * 'application/x-www-form-urlencoded' ：传递简单数据使用，不支持二进制数据
   * 'multipart/form-data' ：支持二进制数据
   */
  contentType: 'multipart/form-data',
  // body仍指定为对象形式，包装FormData的逻辑已集成在api模块中
  body: t<IBatchUploadFaceRequest>('IBatchUploadFaceRequest'),
  responses: {
    200: t<IResponse>('IResponse'),
  },
},


export interface IBatchUploadFaceRequest {
  'Content-Type': string;
  content: File;
  repository_id: string;
}
```

## 3. 接口参数预处理（`defineExtraProps`）

通过 `defineExtraProps` 定义 `_payloadPreprocess`：

- `_payloadPreprocess` 的返回值必须满足该接口原始 payload 结构。
- `_payloadPreprocess` 的入参类型可自定义；接口调用时的入参类型会以该入参类型为准。

### 3.1 示例：简化参数传递

```ts
const { t, defineExtraProps } = ApiHelper;

export default {
  deleteVerifiers: defineExtraProps(
    {
      method: 'DELETE',
      path: `${URI.OPOD_V1}/region_app/account`,
      body: t<IDeleteVerifiersBody>('IDeleteVerifiersBody'),
      query: t<IDeleteVerifiersBody>('IDeleteVerifiersBody'),
      responses: {
        200: t<IResponse>('IResponse'),
      },
    },
    {
      _payloadPreprocess(verifierIds: string[]) {
        const data = {
          verifier_ids: verifierIds.join(','),
        };
        return {
          body: data,
          query: data,
        };
      },
    },
  ),
} as const satisfies ApiModuleValid;

export interface IDeleteVerifiersBody {
  verifier_ids: string;
}
```

调用对比：

```ts
const idList = ['1', '2'];

// 原有调用
const idString = idList.join(',');
Api.Region.deleteVerifiers({
  body: { verifier_ids: idString },
  query: { verifier_ids: idString },
});

// 添加 _payloadPreprocess 后的调用
Api.Region.deleteVerifiers(idList);
```

### 3.2 示例：约束特殊格式字符串

```ts
const { t, defineExtraProps } = ApiHelper;

export default {
  postSubjectQuery: defineExtraProps(
    {
      method: 'POST',
      path: `/v1/dynamicRepos/MOTOR_VEHICLE/subjects/query`,
      query: t<IPostSubjectQueryQuery>('IPostSubjectQueryQuery'),
      body: t<IPostSubjectQueryRequest>('IPostSubjectQueryRequest'),
      headers: t<IPostSubjectQueryHeaders>('IPostSubjectQueryHeaders'),
      responses: {
        200: t<IPostSubjectQueryResponse>('IPostSubjectQueryResponse'),
      },
    },
    {
      _payloadPreprocess: (payload: {
        query: IPostSubjectQueryQuery;
        body: IPostSubjectQueryRequest;
        headers: {
          clusterId: string;
        };
      }) => {
        return {
          ...payload,
          headers: {
            'X-OneAPI-Forward': `target=${payload.headers.clusterId}`,
          },
        };
      },
    },
  ),
} as const satisfies ApiModuleValid;

export interface IPostSubjectQueryHeaders {
  'X-OneAPI-Forward': string;
}
```

### 3.3 示例：容错与默认值

```ts
const { t, defineExtraProps } = ApiHelper;

export default {
  queryFaceInfo: defineExtraProps(
    {
      method: 'POST',
      path: '/{apiUrl}/get_user_info',
      pathParams: t<IQueryFaceInfoPathParams>('IQueryFaceInfoPathParams'),
      body: t<IQueryFaceInfoBody>('IQueryFaceInfoBody'),
      responses: {
        200: t<IQueryFaceInfoResponse>('IQueryFaceInfoResponse'),
      },
    },
    {
      _payloadPreprocess: (payload: {
        pathParams: IQueryFaceInfoPathParams;
        body: Partial<IQueryFaceInfoBody>; // 参数都转为可选
      }) => {
        // 由于 OpenApi 规范规定 path 必须以 / 开头，去除 apiUrl 开头的 / 防止出错
        const apiUrl = payload.pathParams.apiUrl.replace(/^\//, '');
        // 为参数设置默认值
        const defaultBody = {
          image_id: '',
          user_id: '',
          user_type: '',
          capture_img: '',
          similarity_value: 0,
          capture_time: 0,
          caller_info: '',
          caller_id: '',
        };
        return {
          pathParams: { apiUrl },
          body: { ...defaultBody, ...payload.body },
        };
      },
    },
  ),
} as const satisfies ApiModuleValid;

export interface IQueryFaceInfoBody {
  image_id: string;
  user_id: string;
  user_type: string;
  capture_img: string;
  similarity_value: number;
  capture_time: number;
  caller_info: string;
  caller_id: string;
}
```

## 4. 接口调用

```ts
import { Api } from '@/api/index';

// 1) 基础调用：返回类型为该接口定义的 responses[200]
const res = await Api.Sample.samplePost({
  query: { sampleQuery: 'xx' },
  pathParams: { sampleId: 'xx' },
  headers: { sampleHeader: 'xx' },
  body: { sampleBody: 'xx' },
});

// 2) 需要返回完整响应，即 AxiosResponse<Response>
const res = await Api.Sample.samplePost({...}, {
  fullResponse: true
})

// 3) 传入axios额外配置，可用于配置超时时间、中断信号等
const res = await Api.Sample.samplePost({...}, {
  axiosConfig: {
    timeout: 99999999,
    signal: new AbortController().signal
  }
})
```

## 5. 启动接口文档

```bash
pnpm api:doc
```
