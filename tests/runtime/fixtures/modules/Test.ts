import { ApiHelper } from 'sand-api';
import type { ApiModuleValid } from 'sand-api';

const { t, defineExtraProps } = ApiHelper;

const paramsSerializerWithoutEncode = (params: Record<string, any>) => {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
};

export default {
  getList: {
    method: 'GET',
    path: '/test/list',
    query: t<TestListQuery>('TestListQuery'),
    responses: {
      200: t<TestListResponse>('TestListResponse'),
    },
  },
  updateItem: defineExtraProps(
    {
      method: 'PUT',
      path: '/test/item/{id}',
      pathParams: t<TestUpdatePathParams>('TestUpdatePathParams'),
      body: t<TestUpdateBody>('TestUpdateBody'),
      responses: {
        200: t<TestUpdateResponse>('TestUpdateResponse'),
      },
    },
    {
      _presetAxiosConfig: {
        timeout: 1000,
      },
    },
  ),
  submitWithPreprocess: defineExtraProps(
    {
      method: 'POST',
      path: '/{service}/submit',
      pathParams: t<TestSubmitPathParams>('TestSubmitPathParams'),
      headers: t<TestSubmitHeaders>('TestSubmitHeaders'),
      body: t<TestSubmitBody>('TestSubmitBody'),
      responses: {
        200: t<TestSubmitResponse>('TestSubmitResponse'),
      },
    },
    {
      _payloadPreprocess: (payload: TestPreprocessInput) => {
        return {
          pathParams: {
            service: payload.basePath.replace(/^\//, ''),
          },
          headers: {
            Authorization: `Bearer ${payload.token}`,
          },
          body: payload.payload,
        };
      },
    },
  ),
  uploadBinary: {
    method: 'POST',
    path: '/test/storage/blob',
    contentType: 'application/octet-stream',
    body: t<Blob>('Blob'),
    responses: {
      200: t<TestUploadBinaryResponse>('TestUploadBinaryResponse'),
    },
  },
  submitForm: {
    method: 'POST',
    path: '/test/form/submit',
    contentType: 'multipart/form-data',
    body: t<TestSubmitFormBody>('TestSubmitFormBody'),
    responses: {
      200: t<TestSubmitFormResponse>('TestSubmitFormResponse'),
    },
  },
  deleteUsers: defineExtraProps(
    {
      method: 'DELETE',
      path: '/test/user',
      query: t<TestDeleteUsersQuery>('TestDeleteUsersQuery'),
      responses: {
        200: t<TestDeleteUsersResponse>('TestDeleteUsersResponse'),
      },
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
  nonstandardQuery: defineExtraProps(
    {
      method: 'POST',
      path: '/test/custom-query',
      headers: t<TestNonstandardHeaders>('TestNonstandardHeaders'),
      body: t<TestNonstandardBody>('TestNonstandardBody'),
      responses: {
        200: t<TestNonstandardResponse>('TestNonstandardResponse'),
      },
    },
    {
      _payloadPreprocess(payload: TestNonstandardInput) {
        return {
          body: payload.body,
          headers: {
            'Custom-UserInfo': `id=${payload.headers.id},name=${payload.headers.name}`,
          },
        };
      },
    },
  ),
  registerUser: defineExtraProps(
    {
      method: 'POST',
      path: '/test/user/register',
      body: t<TestRegisterUserBody>('TestRegisterUserBody'),
      responses: {
        200: t<TestRegisterUserResponse>('TestRegisterUserResponse'),
      },
    },
    {
      _payloadPreprocess(payload: TestRegisterUserInput) {
        return {
          body: {
            locale: typeof navigator === 'undefined' ? 'en-US' : navigator.language,
            ...payload.body,
          },
        };
      },
    },
  ),
  deleteUsersWithCustomAxiosConfig: defineExtraProps(
    {
      method: 'DELETE',
      path: '/test/user',
      query: t<TestDeleteUsersQuery>('TestDeleteUsersQuery'),
      responses: {
        200: t<TestDeleteUsersResponse>('TestDeleteUsersResponse'),
      },
    },
    {
      _presetAxiosConfig: {
        paramsSerializer: paramsSerializerWithoutEncode,
      },
    },
  ),
  registerUserWithAnotherInstance: defineExtraProps(
    {
      method: 'POST',
      path: '/test/user/register',
      body: t<TestRegisterUserBody>('TestRegisterUserBody'),
      responses: {
        200: t<TestRegisterUserResponse>('TestRegisterUserResponse'),
      },
    },
    {
      _axiosInstance: 'reporting',
    },
  ),
} as const satisfies ApiModuleValid;

export interface TestListQuery {
  page: number;
  keyword?: string;
}

export interface TestListResponse {
  rtn: number;
  items: Array<{ id: string }>;
}

export interface TestUpdatePathParams {
  id: string;
}

export interface TestUpdateBody {
  name: string;
}

export interface TestUpdateResponse {
  rtn: number;
  updated: boolean;
}

export interface TestSubmitPathParams {
  service: string;
}

export interface TestSubmitHeaders {
  Authorization: string;
}

export interface TestSubmitBody {
  value: string;
}

export interface TestSubmitResponse {
  rtn: number;
}

export interface TestPreprocessInput {
  basePath: string;
  token: string;
  payload: TestSubmitBody;
}

export interface TestUploadBinaryResponse {
  success: boolean;
}

export interface TestSubmitFormBody {
  content: Blob | File;
  name: string;
}

export interface TestSubmitFormResponse {
  success: boolean;
}

export interface TestDeleteUsersQuery {
  user_ids: string;
}

export interface TestDeleteUsersResponse {
  success: boolean;
}

export interface TestNonstandardHeaders {
  'Custom-UserInfo': string;
}

export interface TestNonstandardBody {
  page: number;
  size: number;
}

export interface TestNonstandardResponse {
  success: boolean;
}

export interface TestNonstandardInput {
  body: TestNonstandardBody;
  headers: {
    id: string;
    name: string;
  };
}

export interface TestRegisterUserBody {
  name: string;
  locale: string;
}

export interface TestRegisterUserInput {
  body: Omit<TestRegisterUserBody, 'locale'> & Partial<Pick<TestRegisterUserBody, 'locale'>>;
}

export interface TestRegisterUserResponse {
  success: boolean;
}
