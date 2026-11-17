# ديار · Diyar

A daily-rental platform for chalets, villas and apartments, built from the spec in `منصةديار.docx`.
It covers four apps in one codebase: guest site, host dashboard, service provider app and admin panel.

| Layer | Stack |
|---|---|
| Frontend | React 19 + Vite, Tailwind v4, Framer Motion, React-Leaflet, Recharts (Arabic RTL / English) |
| Backend | ASP.NET Core Web API (.NET 10), minimal APIs, JWT, SignalR |
| Database | PostgreSQL 18 + PostGIS (EF Core + NetTopologySuite) |

## Run locally

```bash
brew services start postgresql@18          # role postgres/postgres must exist
cd MyProject.API && dotnet run              # http://localhost:5188, creates + seeds the DB on first run
cd frontend && npm run dev                  # http://localhost:5173 (proxies /api, /uploads, /hubs)
```

If the API runs on another port: `API_URL=http://localhost:5190 npm run dev`.

## Publish (one app: site + API)

```bash
dotnet publish MyProject.API -c Release -o publish
```

This builds the React app and puts it in `publish/wwwroot`, so the .NET app serves the website, `/api` and `/hubs` from one port.
Run it on the server with `dotnet MyProject.API.dll`; set `ConnectionStrings__Default` and `Jwt__Key` as environment variables.
Uploaded images go to `wwwroot/uploads` inside the app folder, so keep that folder when you deploy a new version.

## Demo accounts (dev seed)

Log in with a phone number. In Development the OTP is shown in the login dialog.

| Role | Phone |
|---|---|
| Admin | 0500000000 |
| Host | 0500000001 |
| Guest | 0500000002 |
| Service provider | 0500000003 |

## Not wired yet (stubs to replace before production)

- **SMS**: OTP codes are logged/returned in dev (`AuthEndpoints.cs`); plug Unifonic/Twilio.
- **Payments**: bookings are confirmed immediately (`GuestEndpoints.cs`); integrate Moyasar/HyperPay, Tamara, Tabby.
- **File storage**: `LocalFileStorage` writes to `wwwroot/uploads`; add a Cloudinary/S3 `IFileStorage`.
- **Redis cache**: not added yet.
- **Schema**: `EnsureCreated` is used; switch to EF migrations before the first deploy.
- **Secrets**: `Jwt:Key` and the connection string in `appsettings.json` are dev values.

## Deploy on Back4App Containers (free)

Back4App has no PostgreSQL, so create a free database on [Neon](https://neon.tech) first (PostGIS works there) and copy its connection link.

1. back4app.com → **Build new app** → **Containers as a Service** → connect GitHub and pick this repo (branch with the `Dockerfile`).
2. Root directory `./`, it finds the `Dockerfile` and port `8080` on its own.
3. **Environment variables**:
   - `DATABASE_URL` = the Neon link (`postgresql://user:pass@host/db?sslmode=require`)
   - `Jwt__Key` = any long random text (40+ characters)
   - `SeedDemoData` = `true` (optional: demo listings and accounts)
4. **Create App**. The first build takes a few minutes; the site and `/api` are on the `*.b4a.run` link it gives you.

Uploaded images are kept inside the container, so they are lost when the app is redeployed.
