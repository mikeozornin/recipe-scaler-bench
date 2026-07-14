# Recipe Scaler Bench — static site

SSG site (Astro + React islands) for the AI design experiment.

- **URL:** `https://mikeozornin.ru/recipe-scaler-bench/`
- **Stack:** Astro (static), React islands, Tailwind, Lucide
- **Data:** `data/runs.json`
- **Images:** prepared into `public/images/` at build time

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

Два плейбука в `ansible/` — конфиг и файлы раздельно:

```bash
cd ansible
ansible-playbook update-nginx.yml   # location + include в default, reload
ansible-playbook deploy-files.yml   # npm run build + rsync dist/
```

Подробнее: [ansible/README.md](ansible/README.md).

## Edit results

1. Update `data/runs.json` (tiers, comments, image basenames)
2. Drop new PNGs into `../2026-05-07 Пост про ии-дизайн/png/` (and `2400/` thumbs)
3. `npm run prepare-images && npm run build`
