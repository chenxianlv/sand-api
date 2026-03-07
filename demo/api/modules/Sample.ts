import { ApiHelper, type ApiModuleValid } from 'sand-api';
import { paramsSerializerWithoutEncode } from '../../utils/serialize';

/**
 * 辅助定义类型，用于同时提供静态类型和动态类型标识，需要保证传入的字符串是泛型类型名
 * 所有传递给 t 函数的类型都要使用 export 导出，供 Node.js 运行时解析使用
 */
const { t, defineExtraProps } = ApiHelper;

export default {
  // 1. 常规接口定义
  samplePost: {
    method: 'POST',
    path: '/sampleService/query/{sampleId}',
    query: t<SamplePostQuery>('SamplePostQuery'),
    pathParams: t<SamplePostPathParams>('SamplePostPathParams'),
    headers: t<SamplePostHeaders>('SamplePostHeaders'),
    body: t<SamplePostBody>('SamplePostBody'),
    responses: {
      200: t<SamplePostResponse>('SamplePostResponse'),
    },
  },

  // 2. 二进制流上传
  storeImage: {
    method: 'POST',
    path: '/sampleStorage/image',
    contentType: 'application/octet-stream',
    body: t<Blob>('Blob'),
  },

  // 3. 表单上传
  submitForm: {
    method: 'POST',
    path: '/sampleService/form/submit',
    contentType: 'multipart/form-data',
    body: t<SubmitFormBody>('SubmitFormBody'),
  },

  // 4. defineExtraProps：简化参数传递
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

  // 5. defineExtraProps：约束特殊格式字符串
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

  // 6. defineExtraProps：默认值
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

  // 7. defineExtraProps：指定Axios配置
  deleteUsersWithCustomAxiosConfig: defineExtraProps(
    {
      method: 'DELETE',
      path: '/sampleService/user',
      query: t<DeleteUsersQuery>('DeleteUsersQuery'),
    },
    {
      _presetAxiosConfig: {
        paramsSerializer: paramsSerializerWithoutEncode,
      },
    },
  ),

  // 8. defineExtraProps：指定Axios实例
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

export interface SubmitFormBody {
  content: Blob | File;
  name: string;
}

export interface DeleteUsersQuery {
  user_ids: string;
}

export interface NonstandardQueryBody {
  page: number;
  size: number;
}

export interface NonstandardQueryHeaders {
  'Custom-UserInfo': string;
}

export interface RegisterUserBody {
  name: string;
  locale: string;
}
