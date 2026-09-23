# Ansible deploy — recipe-scaler-bench

Два независимых плейбука:

| Плейбук | Что делает |
|---------|------------|
| `update-nginx.yml` | Сниппет location + include в `sites-enabled/default`, `nginx -t`, reload |
| `deploy-files.yml` | `npm run build` локально + rsync `dist/` → `/usr/share/nginx/html/recipe-scaler-bench/` |

На Selectel `sites-enabled/default` — обычный файл (не symlink на `sites-available`). Ansible пишет в `sites-enabled`.

## Первый деплой

```bash
cd site/ansible

# 1) nginx (один раз / при смене path)
ansible-playbook update-nginx.yml

# 2) файлы
ansible-playbook deploy-files.yml
```

## Только файлы (после правок UI)

```bash
ansible-playbook deploy-files.yml
# или без пересборки:
ansible-playbook deploy-files.yml -e skip_build=true
```

## Только nginx

```bash
ansible-playbook update-nginx.yml
```

## URL

https://mikeozornin.ru/recipe-scaler-bench/

RSS:

- https://mikeozornin.ru/recipe-scaler-bench/rss.xml
- https://mikeozornin.ru/recipe-scaler-bench/en/rss.xml

Ленты генерируются командой `npm run build` и деплоятся вместе с остальным содержимым `dist/`.
