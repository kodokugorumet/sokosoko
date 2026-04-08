import { defineArrayMember, defineField, defineType } from 'sanity';

/**
 * A Q&A entry for /qa.
 *
 * Shape is deliberately simpler than `post`: no cover image, no author
 * reference, no tags. The editor writes the question itself (as the
 * title) and one answer body per locale, optionally tagged to one of
 * the three pillars for filtering.
 */
export const question = defineType({
  name: 'question',
  title: '質問 / 질문',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: '質問 / 질문',
      description: '質問そのものを一文で / 질문을 한 문장으로',
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
      name: 'pillar',
      title: '分類 / 분류',
      type: 'string',
      options: {
        list: [
          { title: '暮らし / 라이프', value: 'life' },
          { title: '学ぶ / 유학', value: 'study' },
          { title: '旅行 / 여행', value: 'trip' },
          { title: 'その他 / 기타', value: 'other' },
        ],
        layout: 'radio',
      },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'featured',
      title: '注目 / 주요 질문',
      description: 'トップに固定表示 / 상단 고정',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'askedAt',
      title: '受付日 / 접수일',
      type: 'datetime',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'answerJa',
      title: '回答（日本語）',
      type: 'array',
      of: [
        defineArrayMember({ type: 'block' }),
        defineArrayMember({ type: 'image', options: { hotspot: true } }),
      ],
    }),
    defineField({
      name: 'answerKo',
      title: '답변 (한국어)',
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
      subtitle: 'pillar',
    },
  },
  orderings: [
    {
      title: '受付日（新しい順）',
      name: 'askedAtDesc',
      by: [{ field: 'askedAt', direction: 'desc' }],
    },
  ],
});
