# safe-to-spend-scaffold

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
npm run test:unit
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```

## Публикация на GitHub Pages

Проект настроен для адреса `https://alekseimastiaev.github.io/Safe-to-Spend/`.
Наличие конфигурации ещё не означает, что сайт опубликован.

- Vite использует `base: '/Safe-to-Spend/'`, чтобы HTML ссылался на JS и CSS внутри пути репозитория.
- Vue Router использует hash-навигацию: главная страница имеет адрес `/Safe-to-Spend/#/`.
  Часть после `#` не отправляется на сервер, поэтому прямое открытие и обновление маршрутов
  не требуют серверного перенаправления на `index.html`.
- `npm run build` создаёт каталог `dist`. На Pages публикуется только его содержимое,
  а не исходники, `node_modules` или локальные данные браузера.
- Workflow `.github/workflows/deploy.yml` запускается при push в `master` или вручную
  через `workflow_dispatch`. Ручной запуск для другой ветки пропускает публикацию.
- Job `build` выполняет `npm ci`, lint, typecheck, test и build, затем сохраняет `dist`
  как Pages artifact. Job `deploy` запускается только после успешного `build`.
  Проверки повторяются здесь, чтобы публикация не зависела от параллельного workflow CI.

Перед первой публикацией в репозитории нужно выбрать **Settings → Pages → Build and deployment →
Source → GitHub Actions**. Затем отправить изменения в `master` и проверить оба job
во вкладке **Actions**. Workflow не меняет видимость репозитория и не включает Pages автоматически.

Для локального просмотра готовой сборки после `npm run build` запустите `npm run preview`
и откройте `http://localhost:4173/Safe-to-Spend/#/`.
Для разработки используйте `npm run dev` и адрес с `/Safe-to-Spend/`, который покажет Vite.
Preview служит только локальной проверке сборки, а не публичным production-сервером.
