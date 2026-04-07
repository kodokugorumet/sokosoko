import { createClient } from 'next-sanity';

import { apiVersion, dataset, projectId } from '../env';

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false, // false: ISR / tag-based revalidation 사용 시 권장 (ADR-0001)
});
