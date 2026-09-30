# Облачная база Safe to Spend

Приложение автоматически включает Supabase, когда во время сборки доступны обе переменные:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

Без них сохраняется локальный режим IndexedDB.

## Подключение проекта

1. Создать проект Supabase.
2. Выполнить SQL из `supabase/migrations/202609250001_cloud_budget.sql` через SQL Editor или Supabase CLI.
3. В Authentication → URL Configuration добавить:
   - Site URL: `https://alekseimastiaev.github.io/Safe-to-Spend/`
   - Redirect URL: `https://alekseimastiaev.github.io/Safe-to-Spend/`
4. В GitHub Actions добавить repository variables `VITE_SUPABASE_URL` и `VITE_SUPABASE_PUBLISHABLE_KEY`.
5. Передать их в шаг `npm run build` workflow публикации.

## Вход через GitHub

1. Создать GitHub OAuth App с homepage `https://alekseimastiaev.github.io/Safe-to-Spend/`.
2. Указать callback `https://djkdsppljjuqzjdlelee.supabase.co/auth/v1/callback`.
3. В Supabase Authentication → Sign In / Providers → GitHub включить провайдер и сохранить Client ID и Client Secret.

Client Secret хранится только в настройках Supabase и не добавляется в Vite, GitHub Actions или репозиторий.

В frontend используется только publishable key. Secret key и устаревший `service_role` нельзя добавлять в Vite, GitHub Pages или репозиторий.

## Модель доступа

Каждая финансовая таблица содержит `user_id`. Row Level Security разрешает `select`, `insert`, `update` и `delete` только при `auth.uid() = user_id`. Связи с месяцами и обязательствами используют составные внешние ключи `(user_id, id)`, поэтому дочерняя запись не может быть привязана к данным другого пользователя.

Пакет платежей и создание нового месяца выполняются PostgreSQL-функциями в одной транзакции. Realtime сообщает другим открытым устройствам об изменениях и запускает повторное чтение данных.
