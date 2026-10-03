# Safe to Spend

Персональный планировщик месячного бюджета. Приложение показывает, сколько уже полученных денег можно потратить после свободных расходов и резервирования неоплаченных обязательств.

**Текущая версия:** `0.1.0` (MVP)

Рабочий адрес после публикации в GitHub Pages: <https://alekseimastiaev.github.io/Safe-to-Spend/>

## Возможности

- учёт плановых и полученных доходов;
- обязательные расходы, частичные платежи, резерв, экономия и перерасход;
- свободные расходы;
- история бюджетов по месяцам;
- расчёт фактического баланса, безопасного остатка и дневного лимита;
- экспорт резервной копии в JSON и полная очистка данных;
- локальное хранение в IndexedDB или облачная синхронизация через Supabase;
- вход через GitHub или одноразовую ссылку на email в облачном режиме.

## Как войти

Экран входа появляется только в облачной сборке, настроенной через Supabase.

### Через GitHub

1. Нажмите **«Войти через GitHub»**.
2. Авторизуйтесь на GitHub и разрешите доступ приложению.
3. После возврата в Safe to Spend создайте первый бюджетный месяц или продолжите работу с существующими данными.

### Через email

1. Введите email и нажмите **«Получить ссылку для входа»**.
2. Откройте письмо от Supabase.
3. Перейдите по одноразовой ссылке в том же браузере и на том же устройстве, где запрашивали вход.

Сессия сохраняется в браузере. Чтобы завершить её, откройте **Настройки → Аккаунт → Выйти**.

Если письмо не пришло, проверьте папку «Спам» и правильность адреса. Если ссылка снова открывает экран входа, запросите новую и убедитесь, что открываете её в исходном браузере, а адрес приложения добавлен в разрешённые Redirect URLs проекта Supabase.

## Режимы хранения

Режим выбирается во время сборки:

| Режим | Условие | Вход | Где хранятся данные |
| --- | --- | --- | --- |
| Локальный | Переменные Supabase не заданы | Не требуется | IndexedDB текущего браузера |
| Облачный | Заданы обе переменные `VITE_SUPABASE_URL` и `VITE_SUPABASE_PUBLISHABLE_KEY` | Обязателен | PostgreSQL в Supabase с Row Level Security |

Локальные и облачные данные не объединяются автоматически. Перед очисткой браузера или сменой устройства скачайте резервную копию в настройках приложения.

## Локальный запуск

Требования:

- Node.js `22.22.2` (версия зафиксирована в `.nvmrc`);
- npm из комплекта Node.js.

Установите зависимости и запустите dev-сервер:

```sh
npm ci
npm run dev
```

Откройте адрес, который выведет Vite; по умолчанию это `http://localhost:5173/Safe-to-Spend/`. Без файла окружения приложение запустится в локальном режиме и не потребует входа.

### Локальный запуск с Supabase

1. Создайте локальный файл окружения:

   ```powershell
   Copy-Item .env.example .env.local
   ```

2. Заполните его публичными параметрами проекта:

   ```dotenv
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
   ```

3. Добавьте `http://localhost:5173/Safe-to-Spend/` в **Authentication → URL Configuration → Redirect URLs** в Supabase.
4. Перезапустите `npm run dev` после изменения переменных окружения.

Переменные с префиксом `VITE_` попадают в клиентскую сборку. Здесь допустим только publishable key. Никогда не добавляйте в `.env.local`, GitHub Actions или frontend `service_role`, secret key либо GitHub OAuth Client Secret.

## Настройка Supabase и авторизации

1. Создайте проект Supabase.
2. Выполните миграцию [`supabase/migrations/202609250001_cloud_budget.sql`](supabase/migrations/202609250001_cloud_budget.sql) через SQL Editor или Supabase CLI.
3. В **Authentication → URL Configuration** укажите:
   - Site URL: `https://alekseimastiaev.github.io/Safe-to-Spend/`;
   - Redirect URLs: production-адрес выше и адрес локальной разработки.
4. Убедитесь, что провайдер Email включён, если нужен вход по одноразовой ссылке.
5. Для входа через GitHub создайте GitHub OAuth App:
   - Homepage URL: `https://alekseimastiaev.github.io/Safe-to-Spend/`;
   - Authorization callback URL: `https://<project-ref>.supabase.co/auth/v1/callback`.
6. В **Authentication → Sign In / Providers → GitHub** включите провайдер и сохраните Client ID и Client Secret OAuth-приложения.
7. Для облачной публикации добавьте в **GitHub → Settings → Secrets and variables → Actions → Variables** значения `VITE_SUPABASE_URL` и `VITE_SUPABASE_PUBLISHABLE_KEY`.

Подробности собраны в [`docs/cloud-setup.md`](docs/cloud-setup.md). Все финансовые таблицы защищены политиками Row Level Security по `auth.uid()`.

## Команды

| Команда | Назначение |
| --- | --- |
| `npm run dev` | Dev-сервер с горячей перезагрузкой |
| `npm run build` | TypeScript-проверка и production-сборка |
| `npm run preview` | Локальный просмотр содержимого `dist` |
| `npm run test` | Однократный запуск тестов |
| `npm run test:unit` | Vitest в watch-режиме |
| `npm run typecheck` | Проверка типов Vue и TypeScript |
| `npm run lint` | Oxc и ESLint |
| `npm run format` | Форматирование исходников Prettier |

Полная локальная проверка перед коммитом:

```sh
npm run lint
npm run typecheck
npm run test
npm run build
```

## Публикация

Workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) проверяет проект, собирает `dist` и публикует его в GitHub Pages после push в `master`. Перед первой публикацией выберите **Settings → Pages → Build and deployment → Source → GitHub Actions**.

Приложение использует `base: '/Safe-to-Spend/'` и hash-навигацию, поэтому production-маршруты имеют вид `https://alekseimastiaev.github.io/Safe-to-Spend/#/history`.

## Стек и структура

- Vue 3, TypeScript, Pinia и Vue Router;
- Vite для разработки и сборки;
- Dexie/IndexedDB для локального режима;
- Supabase Auth, PostgreSQL, Realtime и Row Level Security для облачного режима;
- Vitest и Vue Test Utils для тестов.

Основные каталоги:

- `src/domain` — модели и расчёты без зависимости от Vue;
- `src/shared/db` — локальное хранение;
- `src/shared/supabase` — облачные репозитории и Realtime;
- `src/views` и `src/components` — интерфейс;
- `supabase/migrations` — схема облачной базы;
- `docs` — границы MVP, доменная модель и архитектурные решения.
