using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MyProject.API.Data;
using MyProject.API.Hubs;

namespace MyProject.API.Services;

public class TokenService(IConfiguration config)
{
    public string Create(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Key"]!));
        var token = new JwtSecurityToken(
            issuer: config["Jwt:Issuer"],
            audience: config["Jwt:Issuer"],
            claims:
            [
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.FullName),
                new Claim(ClaimTypes.Role, user.Role.ToString()),
            ],
            expires: DateTime.UtcNow.AddDays(30),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

/// <summary>Stores a notification and pushes it live over SignalR to the user's group.</summary>
public class Notifier(AppDb db, IHubContext<NotificationHub> hub)
{
    public async Task Send(Guid userId, string title, string body, string type = "info", string? link = null)
    {
        var n = new Notification { UserId = userId, Title = title, Body = body, Type = type, Link = link };
        db.Notifications.Add(n);
        await db.SaveChangesAsync();
        await hub.Clients.Group(userId.ToString()).SendAsync("notification", n);
    }
}

/// <summary>File storage abstraction: local disk now, swap for Cloudinary/S3 by registering another implementation.</summary>
public interface IFileStorage
{
    Task<string> Save(IFormFile file);
}

public class LocalFileStorage(IWebHostEnvironment env) : IFileStorage
{
    public async Task<string> Save(IFormFile file)
    {
        var dir = Path.Combine(env.ContentRootPath, "wwwroot", "uploads");
        Directory.CreateDirectory(dir);
        var name = $"{Guid.NewGuid():N}{Path.GetExtension(file.FileName).ToLowerInvariant()}";
        await using var fs = File.Create(Path.Combine(dir, name));
        await file.CopyToAsync(fs);
        return $"/uploads/{name}";
    }
}

public record Quote(int Nights, decimal NightPrice, decimal Subtotal, decimal ServiceFee, decimal Vat, decimal Deposit, decimal Total);

public class PricingService(AppDb db)
{
    public async Task<decimal> Setting(string key, decimal fallback)
    {
        var s = await db.Settings.FindAsync(key);
        return s != null && decimal.TryParse(s.Value, out var v) ? v : fallback;
    }

    public async Task<Quote> QuoteAsync(Property p, DateOnly from, DateOnly to)
    {
        var nights = Math.Max(1, to.DayNumber - from.DayNumber);
        var feePct = await Setting("serviceFeePercent", 5);
        var vatPct = await Setting("vatPercent", 15);
        var subtotal = p.EffectivePrice * nights;
        var fee = Math.Round(subtotal * feePct / 100, 2);
        var vat = Math.Round((subtotal + fee) * vatPct / 100, 2);
        var deposit = p.Deposit ?? 0;
        return new Quote(nights, p.EffectivePrice, subtotal, fee, vat, deposit, subtotal + fee + vat + deposit);
    }

    public Task<bool> IsAvailable(Guid propertyId, DateOnly from, DateOnly to, Guid? ignoreBooking = null) =>
        db.Bookings.AllAsync(b => b.PropertyId != propertyId || b.Id == ignoreBooking
            || b.Status == BookingStatus.Cancelled || b.CheckOut <= from || b.CheckIn >= to);
}

public static class ClaimsExtensions
{
    public static Guid UserId(this ClaimsPrincipal user) => Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
