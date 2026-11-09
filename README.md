# Irisnguyen — Portfolio

Static site (HTML, CSS, JS — no build step). Everything that goes online lives in `public/`.

```
Portfolio/
├── public/                    ← upload / deploy this folder only
│   ├── index.html, about.html, project.html
│   ├── project-detail-*.html  one page per project
│   ├── 404.html               shown for any unknown address
│   ├── _headers               Cloudflare cache and security headers
│   ├── robots.txt
│   ├── favicon.ico
│   ├── css/style.css
│   ├── js/site.js
│   └── assets/
│       ├── brand/             logo, footer logo, favicon, apple touch icon
│       ├── icons/             arrows, cursor, sparkles and other small SVGs
│       ├── images/            portraits, about hero, tool logos
│       ├── videos/            service videos (home page and menu)
│       ├── thumbs/            project card thumbnails (home, projects, Other Projects)
│       └── projects/<slug>/   images for each project detail page
├── _archive/                  files no page uses any more (not deployed)
└── .claude/                   local preview settings (not deployed)
```

## Deploy to Cloudflare Pages

**Direct upload (simplest)**
1. Cloudflare dashboard → Workers & Pages → Create → Pages → *Upload assets*.
2. Name the project, then drag in the **`public`** folder (not the whole Portfolio folder).
3. For updates: open the project → *Create new deployment* → drag `public` in again.

**From GitHub (deploys on every push)**
1. Push the Portfolio folder to a GitHub repository.
2. Cloudflare → Workers & Pages → Create → Pages → *Connect to Git* → pick the repository.
3. Framework preset: **None**. Build command: *(leave empty)*. Build output directory: **`public`**.

**Wrangler CLI**
```
npx wrangler pages deploy public --project-name irisnguyen
```

## Notes
- Cloudflare serves pages without `.html` (`/about.html` redirects to `/about`); the links work either way.
- `project.html?category=ux-ui` (or `graphic-design`, `branding`) opens the projects page already filtered.
- Every file is well under Cloudflare's 25 MB per-file limit (the largest, a service video, is about 10 MB).
- Preview locally: `npx http-server public -p 5173 -c-1`, then open http://localhost:5173.
