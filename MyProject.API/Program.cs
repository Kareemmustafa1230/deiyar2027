using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MyProject.API.Data;
using MyProject.API.Endpoints;
using MyProject.API.Hubs;
using MyProject.API.Services;

var builder = WebApplication.CreateBuilder(args);

// DATABASE_URL: a postgresql://user:pass@host/db link as Neon, Render, Railway and others give it.
if (Environment.GetEnvironmentVariable("DATABASE_URL") is { Length: > 0 } dbUrl)
{
    var uri = new Uri(dbUrl);
    var userInfo = uri.UserInfo.Split(':', 2);
    builder.Configuration["ConnectionStrings:Default"] =
        $"Host={uri.Host};Port={(uri.Port > 0 ? uri.Port : 5432)};Database={uri.AbsolutePath.TrimStart('/')};" +
        $"Username={Uri.UnescapeDataString(userInfo[0])};Password={Uri.UnescapeDataString(userInfo.ElementAtOrDefault(1) ?? "")};" +
        $"SSL Mode={Environment.GetEnvironmentVariable("DB_SSL_MODE") ?? "Require"}";
}
// Render Blueprints hand the database over as separate DB_HOST / DB_NAME / DB_USER / DB_PASSWORD values.
else if (Environment.GetEnvironmentVariable("DB_HOST") is { Length: > 0 } dbHost)
{
    builder.Configuration["ConnectionStrings:Default"] =
        $"Host={dbHost};Port={Environment.GetEnvironmentVariable("DB_PORT") ?? "5432"};" +
        $"Database={Environment.GetEnvironmentVariable("DB_NAME")};Username={Environment.GetEnvironmentVariable("DB_USER")};" +
        $"Password={Environment.GetEnvironmentVariable("DB_PASSWORD")};" +
        $"SSL Mode={Environment.GetEnvironmentVariable("DB_SSL_MODE") ?? "Require"}";
}

builder.Services.AddOpenApi();
builder.Services.AddDbContext<AppDb>(o => o.UseNpgsql(builder.Configuration.GetConnectionString("Default"), x => x.UseNetTopologySuite()));
builder.Services.ConfigureHttpJsonOptions(o => o.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddSignalR().AddJsonProtocol(o => o.PayloadSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<Notifier>();
builder.Services.AddScoped<PricingService>();
builder.Services.AddSingleton<IFileStorage, LocalFileStorage>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o =>
{
    o.TokenValidationParameters = new TokenValidationParameters
    {
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Issuer"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!)),
    };
    // SignalR sends the token in the query string for WebSockets.
    o.Events = new JwtBearerEvents
    {
        OnMessageReceived = ctx =>
        {
            if (ctx.Request.Path.StartsWithSegments("/hubs")) ctx.Token = ctx.Request.Query["access_token"];
            return Task.CompletedTask;
        },
    };
});
builder.Services.AddAuthorization();
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .WithOrigins(builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? ["http://localhost:5173"])
    .AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDb>();
    // EnsureCreated keeps the dev loop simple; switch to EF migrations before the first production deploy.
    await db.Database.EnsureCreatedAsync();
    // Demo data (listings + demo accounts incl. admin 0500000000) — always in Development, on a server only when SeedDemoData=true.
    // It does nothing if the database already has data.
    if (app.Environment.IsDevelopment() || app.Configuration.GetValue<bool>("SeedDemoData")) await Seed.Run(db);
}

if (app.Environment.IsDevelopment()) app.MapOpenApi();

app.UseCors();
app.UseDefaultFiles(); // serves wwwroot/index.html (the built frontend) at "/"
app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();

app.MapAuth();
app.MapPublic();
app.MapGuest();
app.MapHost();
app.MapProvider();
app.MapAdmin();
app.MapHub<NotificationHub>("/hubs/notifications");

// The React app is published into wwwroot. Unknown /api, /hubs and /uploads paths stay 404s;
// every other path returns index.html so client-side routes (/property/12, /admin, ...) work on refresh.
app.Map("/api/{**rest}", () => Results.NotFound());
app.Map("/hubs/{**rest}", () => Results.NotFound());
app.Map("/uploads/{**rest}", () => Results.NotFound());
app.MapFallbackToFile("index.html");

app.Run();
