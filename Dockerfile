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
# Some hosts (e.g. Hugging Face Spaces) run the container as an arbitrary user; let it save uploads.
RUN mkdir -p /app/wwwroot/uploads && chmod -R 777 /app/wwwroot
# Workstation GC keeps memory low on small free plans (Back4App gives 256 MB).
ENV ASPNETCORE_ENVIRONMENT=Production \
    DOTNET_gcServer=0 \
    DOTNET_GCConserveMemory=5
# Back4App Containers read the app port from EXPOSE.
EXPOSE 8080
# Render (and most hosts) pass the port in $PORT; fall back to 8080.
CMD ["sh", "-c", "ASPNETCORE_URLS=http://0.0.0.0:${PORT:-8080} exec dotnet MyProject.API.dll"]
