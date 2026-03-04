import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    excerpt: z.string(),
    tags: z.array(z.string()).optional(),
    draft: z.boolean().default(false),
    coverImage: z.string().optional(),
  }),
});

export const collections = { posts };
