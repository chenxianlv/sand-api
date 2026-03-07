import { createApi } from 'sand-api';
import { apiContract } from './contract';

export const Api = createApi({
  contract: apiContract,
  axiosInstanceLoadMap: {
    base: () => import('./instances/baseInstance').then(m => m.default),
    reporting: () => import('./instances/reportingInstance').then(m => m.default),
  },
});
