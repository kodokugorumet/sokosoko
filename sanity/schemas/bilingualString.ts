import { defineType } from 'sanity';

export const bilingualString = defineType({
  name: 'bilingualString',
  title: 'Bilingual String (JA/KO)',
  type: 'object',
  fields: [
    { name: 'ja', title: '日本語', type: 'string' },
    { name: 'ko', title: '한국어', type: 'string' },
  ],
});

export const bilingualText = defineType({
  name: 'bilingualText',
  title: 'Bilingual Text (JA/KO)',
  type: 'object',
  fields: [
    { name: 'ja', title: '日本語', type: 'text', rows: 3 },
    { name: 'ko', title: '한국어', type: 'text', rows: 3 },
  ],
});
