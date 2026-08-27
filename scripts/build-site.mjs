import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = process.cwd();
const sourceDir = path.join(projectRoot, 'content', 'announcements');
const outputDir = path.join(projectRoot, 'site');

const escapeHtml = (value) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

function inlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

function renderMarkdown(markdown) {
  const lines = markdown.trim().split(/\r?\n/);
  const html = [];
  let paragraph = [];
  let listOpen = false;

  const closeParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${inlineMarkdown(paragraph.join(' '))}</p>`);
    paragraph = [];
  };
  const closeList = () => {
    if (!listOpen) return;
    html.push('</ul>');
    listOpen = false;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      closeParagraph();
      closeList();
    } else if (trimmed.startsWith('## ')) {
      closeParagraph();
      closeList();
      html.push(`<h3>${inlineMarkdown(trimmed.slice(3))}</h3>`);
    } else if (trimmed.startsWith('# ')) {
      closeParagraph();
      closeList();
      html.push(`<h2>${inlineMarkdown(trimmed.slice(2))}</h2>`);
    } else if (trimmed.startsWith('- ')) {
      closeParagraph();
      if (!listOpen) {
        html.push('<ul>');
        listOpen = true;
      }
      html.push(`<li>${inlineMarkdown(trimmed.slice(2))}</li>`);
    } else {
      paragraph.push(trimmed);
    }
  }

  closeParagraph();
  closeList();
  return html.join('\n');
}

function parsePost(filename, file) {
  const match = file.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error(`${filename}: missing front matter`);

  const frontMatter = Object.fromEntries(
    match[1].split(/\r?\n/).filter(Boolean).map((line) => {
      const separator = line.indexOf(':');
      if (separator === -1) throw new Error(`${filename}: invalid front matter line`);
      return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
    }),
  );

  for (const field of ['title', 'date', 'summary']) {
    if (!frontMatter[field]) throw new Error(`${filename}: missing ${field}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(frontMatter.date)) {
    throw new Error(`${filename}: date must use YYYY-MM-DD`);
  }

  return {
    slug: filename.replace(/\.md$/, ''),
    title: frontMatter.title,
    date: frontMatter.date,
    summary: frontMatter.summary,
    html: renderMarkdown(match[2]),
  };
}

const formatter = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

function renderPosts(posts) {
  if (!posts.length) return '<p class="empty-state">No announcements yet. Check back soon.</p>';
  return posts.map((post, index) => `
          <article class="post-card" id="${escapeHtml(post.slug)}">
            <div class="post-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</div>
            <div>
              <time datetime="${post.date}">${formatter.format(new Date(`${post.date}T00:00:00Z`))}</time>
              <h2>${escapeHtml(post.title)}</h2>
              <p class="post-summary">${escapeHtml(post.summary)}</p>
              <details>
                <summary>Read announcement</summary>
                <div class="post-body">${post.html}</div>
              </details>
            </div>
          </article>`).join('');
}

function announcementsPage(posts) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#74c9f5">
    <meta name="description" content="News, events, and server updates from DUSMP.">
    <meta property="og:title" content="Announcements — DUSMP">
    <meta property="og:description" content="News, events, and server updates from DUSMP.">
    <meta property="og:type" content="website">
    <title>Announcements — DUSMP</title>
    <link rel="stylesheet" href="../styles.css">
  </head>
  <body>
    <main class="announcements-world">
      <div class="sun small-sun" aria-hidden="true"></div>
      <div class="cloud cloud-one" aria-hidden="true"></div>
      <div class="cloud cloud-two" aria-hidden="true"></div>
      <div class="announcements-shell">
        <header class="masthead">
          <a class="brand" href="../">DUSMP</a>
          <nav aria-label="DUSMP links">
            <a href="https://discord.gg/MRQQfkpXT3">Discord</a>
            <a href="http://170.23.51.227:17863/">Map</a>
            <a aria-current="page" href="./">Announcements</a>
          </nav>
        </header>
        <section class="announcements-heading">
          <p class="eyebrow">The notice board</p>
          <h1>Announcements</h1>
          <p>Server news, upcoming events, and important updates.</p>
        </section>
        <div class="post-list">${renderPosts(posts)}
        </div>
        <a class="back-home" href="../">← Back to the world</a>
      </div>
      <div class="ground compact-ground" aria-hidden="true"></div>
    </main>
  </body>
</html>`;
}

await rm(outputDir, { recursive: true, force: true });
await mkdir(path.join(outputDir, 'announcements'), { recursive: true });

const filenames = (await readdir(sourceDir)).filter((name) => name.endsWith('.md'));
const posts = await Promise.all(filenames.map(async (filename) => {
  const file = await readFile(path.join(sourceDir, filename), 'utf8');
  return parsePost(filename, file);
}));
posts.sort((a, b) => b.date.localeCompare(a.date));

await cp(path.join(projectRoot, 'src', 'index.html'), path.join(outputDir, 'index.html'));
await cp(path.join(projectRoot, 'app', 'globals.css'), path.join(outputDir, 'styles.css'));
await writeFile(path.join(outputDir, 'announcements', 'index.html'), announcementsPage(posts));
await writeFile(path.join(outputDir, '.nojekyll'), '');
await writeFile(path.join(outputDir, '404.html'), `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Not found — DUSMP</title><link rel="stylesheet" href="./styles.css"><main class="world"><section class="hero-card"><p class="eyebrow">Lost in the world</p><h1>404</h1><p class="intro">That chunk could not be found.</p><nav class="link-grid"><a class="pixel-button map news" href="./">Back home</a></nav></section><div class="ground" aria-hidden="true"></div></main>`);

console.log(`Built DUSMP with ${posts.length} announcement${posts.length === 1 ? '' : 's'}.`);
