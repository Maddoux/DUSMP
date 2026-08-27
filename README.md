# DUSMP website

A lightweight, animated Minecraft-style website for DUSMP. It includes links to Discord, the live map, and a GitHub-managed announcements page.

## Add an announcement on GitHub

1. Open the `content/announcements` folder in the GitHub repository.
2. Choose **Add file → Create new file**.
3. Name the file something clear ending in `.md`, such as `2026-09-01-building-contest.md`.
4. Use this template:

```md
---
title: Building contest this Saturday
date: 2026-09-01
summary: Join us for a two-hour building contest at spawn.
---

Write the full announcement here.

You can use **bold text**, [links](https://example.com), headings, and bullet lists.
```

5. Commit the new file to the `main` branch. GitHub Pages will rebuild the website automatically.

The announcement filename becomes its internal ID. Keep filenames lowercase and use hyphens instead of spaces.

## Publish with GitHub Pages

Push this project to a GitHub repository whose default branch is `main`. In the repository, open **Settings → Pages**, then set **Source** to **GitHub Actions**. The included workflow will build and publish the site after every push to `main`.

## Local preview

```sh
node scripts/build-site.mjs
python3 -m http.server --directory site 8000
```

Open `http://localhost:8000`.

The published website contains no framework, dependencies, cookies, or trackers—just HTML and CSS.
