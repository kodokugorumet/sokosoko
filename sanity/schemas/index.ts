import type { SchemaTypeDefinition } from 'sanity';
import { bilingualString, bilingualText } from './bilingualString';
import { author } from './author';
import { category } from './category';
import { tag } from './tag';
import { post } from './post';

export const schemaTypes: SchemaTypeDefinition[] = [
  bilingualString,
  bilingualText,
  author,
  category,
  tag,
  post,
];
