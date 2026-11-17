using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using MyProject.API.Data;
using MyProject.API.Services;

namespace MyProject.API.Endpoints;

public record SendOtpReq(string Phone, string Mode);
public record VerifyReq(string Phone, string Code, string? FullName, string? Email, UserRole? Role, bool AcceptTerms);
public record UpdateMeReq(string FullName, string? Email, string? Phone, string? Address, DateOnly? BirthDate, string? AvatarUrl, string? Bio);

public static class AuthEndpoints
{
    static string Normalize(string phone) => new(phone.Where(char.IsDigit).ToArray());

    public static void MapAuth(this WebApplication app)
    {
        var g = app.MapGroup("/api/auth");

        g.MapPost("/send-otp", async (SendOtpReq req, AppDb db, IWebHostEnvironment env, IConfiguration config, ILogger<Program> log) =>
        {
            var phone = Normalize(req.Phone);
            if (phone.Length < 9) return Results.BadRequest(new { error = "invalid_phone" });
            var exists = await db.Users.AnyAsync(u => u.Phone == phone);
            if (req.Mode == "login" && !exists) return Results.NotFound(new { error = "not_registered" });
            if (req.Mode == "register" && exists) return Results.Conflict(new { error = "already_registered" });

            var code = Random.Shared.Next(100000, 999999).ToString();
            db.OtpCodes.RemoveRange(db.OtpCodes.Where(o => o.Phone == phone));
            db.OtpCodes.Add(new OtpCode { Phone = phone, Code = code, ExpiresAt = DateTime.UtcNow.AddMinutes(5) });
            await db.SaveChangesAsync();
            // TODO: plug an SMS gateway (Unifonic / Twilio). Until then the code is logged, and shown in the login
            // dialog in Development or when ShowOtpOnScreen=true (demo servers only: anyone could sign in as anyone).
            log.LogInformation("OTP for {Phone}: {Code}", phone, code);
            var showCode = env.IsDevelopment() || config.GetValue<bool>("ShowOtpOnScreen");
            return Results.Ok(new { sent = true, devCode = showCode ? code : null });
        });

        g.MapPost("/verify", async (VerifyReq req, AppDb db, TokenService tokens) =>
        {
            var phone = Normalize(req.Phone);
            var otp = await db.OtpCodes.FirstOrDefaultAsync(o => o.Phone == phone);
            if (otp == null || otp.ExpiresAt < DateTime.UtcNow) return Results.BadRequest(new { error = "code_expired" });
            if (otp.Code != req.Code)
            {
                otp.Attempts++;
                if (otp.Attempts >= 5) db.OtpCodes.Remove(otp);
                await db.SaveChangesAsync();
                return Results.BadRequest(new { error = "invalid_code" });
            }
            db.OtpCodes.Remove(otp);

            var user = await db.Users.FirstOrDefaultAsync(u => u.Phone == phone);
            if (user == null)
            {
                if (string.IsNullOrWhiteSpace(req.FullName)) return Results.BadRequest(new { error = "name_required" });
                if (!req.AcceptTerms) return Results.BadRequest(new { error = "terms_required" });
                user = new User
                {
                    Phone = phone, FullName = req.FullName.Trim(), Email = req.Email,
                    Role = req.Role is UserRole.Host or UserRole.Provider ? req.Role.Value : UserRole.Guest,
                };
                db.Users.Add(user);
            }
            else if (!user.IsActive) return Results.Json(new { error = "account_disabled" }, statusCode: 403);
            else if (req.Role is UserRole.Host && user.Role == UserRole.Guest) user.Role = UserRole.Host; // guests can become hosts

            await db.SaveChangesAsync();
            return Results.Ok(new { token = tokens.Create(user), user = user.ToDto() });
        });

        var me = app.MapGroup("/api/me").RequireAuthorization();
        me.MapGet("/", async (ClaimsPrincipal p, AppDb db) =>
            await db.Users.FindAsync(p.UserId()) is { } u ? Results.Ok(u.ToDto()) : Results.Unauthorized());

        me.MapPut("/", async (UpdateMeReq req, ClaimsPrincipal p, AppDb db) =>
        {
            var u = await db.Users.FindAsync(p.UserId());
            if (u == null) return Results.Unauthorized();
            u.FullName = req.FullName; u.Email = req.Email; u.Address = req.Address; u.BirthDate = req.BirthDate;
            u.AvatarUrl = req.AvatarUrl ?? u.AvatarUrl; u.Bio = req.Bio;
            u.ProfileCompleted = !string.IsNullOrWhiteSpace(u.FullName) && !string.IsNullOrWhiteSpace(u.Email);
            await db.SaveChangesAsync();
            return Results.Ok(u.ToDto());
        });

        // Lets a guest open the host dashboard without re-registering.
        me.MapPost("/become-host", async (ClaimsPrincipal p, AppDb db, TokenService tokens) =>
        {
            var u = (await db.Users.FindAsync(p.UserId()))!;
            if (u.Role == UserRole.Guest) u.Role = UserRole.Host;
            await db.SaveChangesAsync();
            return Results.Ok(new { token = tokens.Create(u), user = u.ToDto() });
        });

        me.MapGet("/notifications", async (ClaimsPrincipal p, AppDb db) =>
            await db.Notifications.Where(n => n.UserId == p.UserId()).OrderByDescending(n => n.CreatedAt).Take(50).ToListAsync());

        me.MapPost("/notifications/read", async (ClaimsPrincipal p, AppDb db) =>
        {
            await db.Notifications.Where(n => n.UserId == p.UserId() && !n.IsRead).ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true));
            return Results.Ok();
        });

        app.MapPost("/api/uploads", async (IFormFileCollection files, IFileStorage storage) =>
        {
            var urls = new List<string>();
            foreach (var f in files.Take(20))
            {
                if (f.Length > 50 * 1024 * 1024) continue;
                urls.Add(await storage.Save(f));
            }
            return Results.Ok(urls);
        }).RequireAuthorization().DisableAntiforgery();
    }
}
