import type { ApiContractValid } from 'sand-api';
import testModule from './modules/Test';

export const apiContract = {
  Test: testModule,
} as const satisfies ApiContractValid;
