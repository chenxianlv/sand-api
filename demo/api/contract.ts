import type { ApiContractValid } from 'sand-api';
import Sample from './modules/Sample';

export const apiContract = {
  Sample,
} as const satisfies ApiContractValid;
