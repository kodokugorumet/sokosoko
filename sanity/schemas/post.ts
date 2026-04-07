import { defineArrayMember, defineField, defineType } from 'sanity';

export const post = defineType({
  name: 'post',
  title: '記事 / 글',
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
    defineField({
      name: 'excerpt',
      title: '抜粋 / 요약',
      type: 'bilingualText',
    }),
    defineField({
      name: 'coverImage',
      title: 'カバー画像 / 커버 이미지',
      type: 'image',
      options: { hotspot: true },
      fields: [{ name: 'alt', title: 'Alt', type: 'bilingualString' }],
    }),
    defineField({
      name: 'category',
      title: 'カテゴリ / 카테고리',
      type: 'reference',
      to: [{ type: 'category' }],
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'tags',
      title: 'タグ / 태그',
      type: 'array',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'tag' }] })],
    }),
    defineField({
      name: 'author',
      title: '著者 / 저자',
      type: 'reference',
      to: [{ type: 'author' }],
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'publishedAt',
      title: '公開日 / 공개일',
      type: 'datetime',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'bodyJa',
      title: '本文（日本語）',
      type: 'array',
      of: [
        defineArrayMember({ type: 'block' }),
        defineArrayMember({ type: 'image', options: { hotspot: true } }),
      ],
    }),
    defineField({
      name: 'bodyKo',
      title: '본문 (한국어)',
      type: 'array',
      of: [
        defineArrayMember({ type: 'block' }),
        defineArrayMember({ type: 'image', options: { hotspot: true } }),
      ],
    }),
  ],
  preview: {
    select: {
      title: 'title.ja',
      subtitle: 'author.name.ja',
      media: 'coverImage',
    },
  },
});
