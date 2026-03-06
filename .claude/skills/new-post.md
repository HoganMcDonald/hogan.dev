---
name: new-post
description: Scaffold a new blog post with correct frontmatter and file naming
user_invocable: true
---

# New Post

Scaffold a new blog post in `src/content/posts/`.

## Instructions

1. If the user provided a topic/title as arguments (`$ARGUMENTS`), use it. Otherwise, ask for a title.
2. Generate a kebab-case slug from the title (lowercase, spaces to hyphens, strip non-alphanumeric characters except hyphens).
3. Write a new file at `src/content/posts/<slug>.md` with this template:

```markdown
---
title: "<Title>"
date: "<today's date in YYYY-MM-DD format>"
excerpt: ""
draft: true
---

# <Title>
```

4. Do NOT generate post body content unless the user explicitly asks for it.
5. Report the created file path to the user.

## Schema Reference

Required frontmatter fields:
- `title` (string)
- `date` (ISO 8601 date, e.g. 2026-03-04)
- `excerpt` (string)

Optional frontmatter fields:
- `tags` (string array)
- `draft` (boolean, defaults to false)
- `coverImage` (string)
