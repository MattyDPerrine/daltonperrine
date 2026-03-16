import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title:       z.string(),
    description: z.string(),
    date:        z.coerce.date(),
    author:      z.string().default('Dalton Perrine'),
    image:       z.string().optional(),   // e.g. "/images/blog/my-post.jpg"
    tags:        z.array(z.string()).optional(),
    externalUrl: z.string().optional(),   // if set, "Read more" links here instead of local post
    draft:       z.boolean().default(false),
    pinned:      z.boolean().default(false),
  }),
});

export const collections = { blog };
