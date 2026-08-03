# Backend Setup

Express + Prisma + MySQL API for SMARTCOOP.

## Requirements

- **Node.js 20+** (`node --watch` is used by the dev script)
- **MySQL 8** — XAMPP works; start the **MySQL** module from the XAMPP control panel

## 1. Create the database

Create an empty schema named `smartcoop`. Either in phpMyAdmin
(http://localhost/phpmyadmin → New → `smartcoop`), or:

```sh
mysql -u root -e "CREATE DATABASE smartcoop;"
```

## 2. Configure `.env`

```sh
cp .env.example .env
```

Defaults match XAMPP (user `root`, no password, port 3306):

| Variable | Meaning |
|---|---|
| `DATABASE_URL` | `mysql://USER:PASSWORD@localhost:3306/smartcoop` |
| `JWT_SECRET` | any long random string — **change it** |
| `JWT_EXPIRES_IN` | token lifetime, e.g. `1d` |
| `PORT` | API port, default `4000` |
| `CORS_ORIGIN` | frontend origin, `http://localhost:5173` (comma-separate for more) |

If your MySQL root has a password, the URL becomes
`mysql://root:yourpassword@localhost:3306/smartcoop`.

## 3. Install and create the tables

```sh
npm install
npm run migrate     # applies prisma/migrations, generates the client
npm run seed        # barangays, app settings, demo accounts, farmer roster
```

`npm run seed` also imports the cooperative's farmer roster from
`farmers.js.txt` — 774 members numbered `M-0006` onward, added as ASSOCIATE with
no barangay assigned (edit that in Members afterwards). Re-running the seed skips
anyone already imported, so it's safe to run again; the console prints how many
were newly created. To reload the roster after editing `farmers.js.txt`, delete
the affected members first — existing member numbers are never overwritten.

Seeded logins:

| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | ADMIN |
| `staff` | `staff123` | STAFF |
| `mao` | `mao123` | MAO |
| `juan` | `member123` | MEMBER (M-0001) |

## 4. Run

```sh
npm run dev     # auto-restarts on file changes
# npm start     # plain node, for production
```

Check it: http://localhost:4000/api/health → `{"status":"ok"}`

Then start the frontend — see `../frontend/SETUP.md`.

## Other commands

```sh
npm run studio      # Prisma Studio, browse/edit the DB at localhost:5555
npm run generate    # regenerate the Prisma client after editing schema.prisma
```

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Can't reach database server at localhost:3306` | MySQL isn't running — start it in XAMPP |
| `Unknown database 'smartcoop'` | Step 1 was skipped |
| `P1000: Authentication failed` | Wrong user/password in `DATABASE_URL` |
| `@prisma/client did not initialize` | Run `npm run generate` |
| `farmers.js.txt: some rows did not parse` | A name in that file contains a `'` — the seed's tuple regex can't read it. Remove or escape it |
| CORS errors in the browser | `CORS_ORIGIN` must match the Vite URL exactly |
| Port 4000 in use | Change `PORT`, and update `VITE_API_URL` in the frontend |
