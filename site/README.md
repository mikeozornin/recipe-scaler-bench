# Recipe Scaler Bench — static site

SSG site (Astro + React islands) for the AI design experiment.

- **URL:** `https://mikeozornin.ru/recipe-scaler-bench/`
- **Stack:** Astro (static), React islands, Tailwind, Lucide
- **Data:** `data/runs.json`
- **Images:** prepared into `public/images/` at build time
- **RSS:** RU/EN feeds are generated at build as `rss.xml` and `en/rss.xml`, linked from the layout, and deployed with the rest of `dist/` by `ansible/deploy-files.yml`

## Develop

```bash
npm install
npm run prepare-images   # first time / after new PNGs
npm run dev
```

## Build

```bash
npm run build            # runs prepare-images then astro build
npm run preview
```

Output: `dist/` with base path `/recipe-scaler-bench/`.

## Deploy (Ansible)

Плейбуки в [`../ansible/`](../ansible/README.md). Файлы заливаются в `/usr/share/nginx/html/recipe-scaler-bench/` (сниппет в server-блоке `mikeozornin.ru`). Каталог `/var/www/recipe-scaler-bench/` — другой vhost, `bench.mikeozornin.ru`.

```bash
cd ../ansible
ansible-playbook deploy-files.yml   # npm ci, npm run build, rsync dist/
ansible-playbook update-nginx.yml   # сниппет + include в default, reload
```

## Edit results

1. Update `data/runs.json` (tiers, comments, image basenames)
   and `src/lib/model-release.ts` (model announce dates shown in the UI)
2. `npm run prepare-images` — reads source PNGs from `data/source-png/`
   (committed to the repo). If a new run's PNG is missing locally, it is
   fetched once from the blog post (`https://mikeozornin.ru/blog/pictures/`)
   into `data/source-png/` so it can be committed. Hashes + converts into
   `public/images/`.
3. `npm run build`
