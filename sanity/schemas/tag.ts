import { defineField, defineType } from 'sanity';

export const tag = defineType({
  name: 'tag',
  title: 'タグ / 태그',
  type: 'document',
  fields: [
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
  ],
  preview: { select: { title: 'title.ja' } },
});
