import { defineField, defineType } from 'sanity';

export const author = defineType({
  name: 'author',
  title: '著者 / 저자',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: '名前 / 이름',
      type: 'bilingualString',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'name.ja', maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'tier',
      title: 'Member tier (왕관/사과)',
      type: 'string',
      options: {
        list: [
          { title: '👑 Crown (王冠 / 왕관)', value: 'crown' },
          { title: '🍎 Apple (사과)', value: 'apple' },
          { title: '✏️ Contributor (기여자)', value: 'contributor' },
        ],
        layout: 'radio',
      },
      initialValue: 'contributor',
    }),
    defineField({
      name: 'bio',
      title: '自己紹介 / 자기소개',
      type: 'bilingualText',
    }),
    defineField({
      name: 'avatar',
      title: 'アバター / 아바타',
      type: 'image',
      options: { hotspot: true },
    }),
  ],
  preview: {
    select: { title: 'name.ja', subtitle: 'tier', media: 'avatar' },
  },
});
