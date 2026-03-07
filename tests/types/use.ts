import axios from 'axios';
import { createApi } from 'sand-api';
import { typeTestContract } from './contract';

const TypeTestApi = createApi({
  contract: typeTestContract,
  axiosInstanceLoadMap: {
    base: async () => axios.create(),
    custom: async () => axios.create(),
  },
});

// @ts-expect-error 需要 { body: ... } 结构
TypeTestApi.Type.case1({ prop1: '1' });

TypeTestApi.Type.case1({ body: { prop1: '1' } });

// @ts-expect-error axiosInstance 只能是 loadMap 中已注册的 key
TypeTestApi.Type.case1({ body: { prop1: '1' } }, { axiosInstance: 'some' });

TypeTestApi.Type.case2('1');

// @ts-expect-error 需要 { body: ... } 结构
TypeTestApi.Type.case3({ prop1: '1' });

TypeTestApi.Type.case3({ body: { prop1: '1' } });
