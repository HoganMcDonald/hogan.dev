import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypePrism from 'rehype-prism'
import rehypeStringify from 'rehype-stringify'


export default async function markdownToHtml(markdown: string) {
  const result = await unified()
    .use(remarkParse)
    .use(remarkRehype)
    // it should be after rehype
    .use(rehypePrism, { plugins: ['line-numbers'] })
    .use(rehypeStringify)
    .process(markdown)
  return result.toString()
}
