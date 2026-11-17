# Hugging Face Space: pulls the code from GitHub and builds the same image as the repo's Dockerfile.
# To deploy a new version: Space → Settings → Factory rebuild.

FROM alpine/git AS src
ARG REPO=https://github.com/Kareemmustafa1230/deiyar2027.git
RUN git clone --depth 1 $REPO /src

FROM node:24-alpine AS web
WORKDIR /src/frontend
COPY --from=src /src/frontend/package.json /src/frontend/package-lock.json ./
RUN npm ci
COPY --from=src /src/frontend/ ./
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS api
WORKDIR /src
COPY --from=src /src/MyProject.API/ MyProject.API/
COPY --from=web /src/frontend/dist frontend/dist
RUN dotnet publish MyProject.API/MyProject.API.csproj -c Release -o /app -p:SkipSpaBuild=true

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=api /app ./
RUN mkdir -p /app/wwwroot/uploads && chmod -R 777 /app/wwwroot
ENV ASPNETCORE_ENVIRONMENT=Production \
    ASPNETCORE_URLS=http://0.0.0.0:7860 \
    SeedDemoData=true
EXPOSE 7860
CMD ["dotnet", "MyProject.API.dll"]
