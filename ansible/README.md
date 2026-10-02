# Деплой recipe-scaler-bench

Сайт: https://mikeozornin.ru/recipe-scaler-bench/

Живой каталог: `/usr/share/nginx/html/recipe-scaler-bench/`. Его отдаёт сниппет `/etc/nginx/snippets/recipe-scaler-bench.conf`, подключённый в server-блок `mikeozornin.ru` (`/etc/nginx/sites-available/default`).

`/var/www/recipe-scaler-bench/` — другой vhost (`bench.mikeozornin.ru`, `sites-enabled/recipe-scaler-bench.conf`). Туда эти плейбуки ничего не пишут.

Запуск из этого каталога, с машины, где есть SSH-ключ к `root@mikeozornin.ru`:

```bash
ansible-playbook deploy-files.yml    # npm ci, npm run build, rsync dist/
ansible-playbook update-nginx.yml    # сниппет + include, nginx -t, reload
```

`deploy-files.yml` собирает `../site` локально и заливает `dist/` с `--delete`. `update-nginx.yml` нужен, только если меняется nginx; на уже настроенном сервере повторный запуск ничего не переписывает, кроме совпадения шаблона со сниппетом.
