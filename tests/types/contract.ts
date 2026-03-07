import type { ApiContractValid, ApiModuleValid } from 'sand-api';
import { ApiHelper } from 'sand-api';

const { t, defineExtraProps } = ApiHelper;

const typeTestInvalidModule = {
  // @ts-expect-error 未定义 method
  case1: {
    path: '/case',
  },
  // @ts-expect-error 未定义 path
  case2: {
    method: 'GET',
  },
  // @ts-expect-error 普通路由不允许直接声明 extra 配置字段
  case3: {
    method: 'GET',
    path: '/case',
    _presetAxiosConfig: {
      timeout: 1000,
    },
  },
  case4: defineExtraProps(
    {
      method: 'POST',
      path: '/case',
      body: t<TypeTestCaseBody>('TypeTestCaseBody'),
    },
    {
      // @ts-expect-error _payloadPreprocess 的返回值必须满足原始 payload 结构
      _payloadPreprocess(payload: string) {
        return {
          body: {
            prop1: Number(payload),
          },
        };
      },
    },
  ),
} as const satisfies ApiModuleValid;

export const typeTestInvalidContract = {
  // @ts-expect-error 模块类型不满足
  Type: typeTestInvalidModule,
} as const satisfies ApiContractValid;

export const typeTestContract = {
  Type: {
    /** 常规接口 */
    case1: {
      method: 'GET',
      path: '/case',
      body: t<TypeTestCaseBody>('TypeTestCaseBody'),
      responses: {
        200: t<TypeTestCaseResponse>('TypeTestCaseResponse'),
      },
    },
    /** _payloadPreprocess */
    case2: defineExtraProps(
      {
        method: 'POST',
        path: '/case',
        body: t<TypeTestCaseBody>('TypeTestCaseBody'),
      },
      {
        _payloadPreprocess(payload: string) {
          return {
            body: {
              prop1: payload,
            },
          };
        },
      },
    ),
    /** defineExtraProps 但是没有 _payloadPreprocess */
    case3: defineExtraProps(
      {
        method: 'POST',
        path: '/case',
        body: t<TypeTestCaseBody>('TypeTestCaseBody'),
      },
      {
        _presetAxiosConfig: {
          timeout: 1000,
        },
      },
    ),
  },
} as const satisfies ApiContractValid;

export interface TypeTestCaseBody {
  prop1: string;
}

export interface TypeTestCaseResponse {
  result: string;
}
