import { defineField, defineType } from 'sanity';

export const category = defineType({
  name: 'category',
  title: 'カテゴリ / 카테고리',
  type: 'document',
  fields: [
    defineField({
      name: 'pillar',
      title: 'Pillar (3本柱)',
      type: 'string',
      options: {
        list: [
          { title: '暮らす / 살다', value: 'life' },
          { title: '学ぶ / 배우다', value: 'study' },
          { title: '旅する / 여행하다', value: 'trip' },
        ],
        layout: 'radio',
      },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'title',
      title: 'タイトル / 제목',
      type: 'bilingualString',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title.ja', maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'description',
      title: '説明 / 설명',
      type: 'bilingualText',
    }),
    defineField({
      name: 'order',
      title: '表示順 / 표시 순서',
      type: 'number',
      initialValue: 0,
    }),
  ],
  preview: {
    select: { title: 'title.ja', subtitle: 'pillar' },
  },
});
