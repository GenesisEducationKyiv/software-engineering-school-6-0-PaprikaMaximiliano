# ADR-002: Вибір бази даних для зберігання інформації про підписки та репозиторії

**Статус:** Прийнято

**Дата:** 2026-05-08

**Автор:** Maksym Paprotskyi

**Контекст:**

Потрібно обрати базу даних для зберігання:

- Інформації про підписки користувачів
- Репозиторії на які зроблені підписки

База даних повинна відповідати наступним вимогам:

- Наявність вбудованих constraints та primary keys
- Наявність реляцій

**Розглянуті варіанти**

**PostgreSQL**

- Плюси: ACID, потужна робота з реляціями, висока надійність

- Мінуси: Потребує більше ресурсів для роботи порівняно з SQLite.

**MongoDB**

- Плюси: Гнучка схема даних, проста горизонтальна масштабованість.

- Мінуси: Відсутність суворих реляційних зв'язків, що може призвести до дублювання та аномалій у даних підписок.

**SQLite**

- Плюси: Не потребує окремого сервера, ідеально для прототипування.
- Мінуси: Обмеження при паралельному доступі (concurrency), не рекомендується для високонавантажених production-рішень.

**Прийняте рішення**

Обрано PostgreSQL.

**Схема бази даних**

repository

| Column      | Type      | Nullable | Default           | Description                                        |
| ----------- | --------- | -------- | ----------------- | -------------------------------------------------- |
| id          | UUID      | No       | -                 | Primary key, auto-generated                        |
| fullName    | TEXT      | No       | -                 | Full name of repository (e.g. vercel/next.js)      |
| owner       | TEXT      | No       | -                 | Owner of repository (e.g. vercel)                  |
| name        | TEXT      | No       | -                 | Name of repository (e.g. next.js)                  |
| lastSeenTag | TIMESTAMP | Yes      | -                 | Last release tag the subscriber was notified about |
| created_at  | TIMESTAMP | No       | CURRENT_TIMESTAMP | Record creation time (UTC)                         |
| updatedAt   | TIMESTAMP | No       | CURRENT_TIMESTAMP | Last modification time (UTC)                       |

subscriptions

| Column            | Type      | Nullable | Default           | Description                              |
| ----------------- | --------- | -------- | ----------------- | ---------------------------------------- |
| id                | UUID      | No       | -                 | Primary key, auto-generated              |
| email             | TEXT      | No       | -                 | Email of subsription owner               |
| confirmed         | BOOL      | No       | FALSE             | Is subcription confirmed flag            |
| confirmedAt       | TIMESTAMP | Yes      | -                 | Subscription confirmation time (UTC)     |
| confirmationToken | UUID      | No       | -                 | Token used for subscription confirmation |
| unsubscribeToken  | UUID      | No       | -                 | Token used for subscription cancellation |
| repositoryId      | UUID      | No       | -                 | Foreign key, references repository table |
| created_at        | TIMESTAMP | No       | CURRENT_TIMESTAMP | Record creation time (UTC)               |
| updatedAt         | TIMESTAMP | No       | CURRENT_TIMESTAMP | Last modification time (UTC)             |

**Наслідки**

- Позитивні: Гарантована цілісність реляційних даних. Можливість легкого переходу на хмарні рішення (наприклад, Supabase), що значно спростить адміністрування інфраструктури.

- Негативні: Складніший процес налаштування локального середовища (потребує підняття контейнерів Docker) порівняно зі звичайними in-memory або файловими рішеннями.
