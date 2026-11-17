# One image: the React site and the .NET API served from the same port.

# 1) Build the React frontend
FROM node:24-alpine AS web
WORKDIR /src/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# 2) Publish the .NET API, bundling the frontend build into wwwroot
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS api
WORKDIR /src
COPY MyProject.API/MyProject.API.csproj MyProject.API/
RUN dotnet restore MyProject.API/MyProject.API.csproj
COPY MyProject.API/ MyProject.API/
COPY --from=web /src/frontend/dist frontend/dist
RUN dotnet publish MyProject.API/MyProject.API.csproj -c Release -o /app -p:SkipSpaBuild=true --no-restore

# 3) Runtime
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=api /app ./
ENV ASPNETCORE_ENVIRONMENT=Production
# Render (and most hosts) pass the port in $PORT; fall back to 8080.
CMD ["sh", "-c", "ASPNETCORE_URLS=http://0.0.0.0:${PORT:-8080} exec dotnet MyProject.API.dll"]
