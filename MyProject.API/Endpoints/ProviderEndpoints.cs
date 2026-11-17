using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using MyProject.API.Data;
using MyProject.API.Services;

namespace MyProject.API.Endpoints;

public record ServiceReq(int CategoryId, string Title, string Description, decimal Price, int DurationMinutes, string? ImageUrl, bool IsActive);
public record NoteReq(string? Note);

public static class ProviderEndpoints
{
    public static void MapProvider(this WebApplication app)
    {
        var g = app.MapGroup("/api/provider").RequireAuthorization(pol => pol.RequireRole("Provider", "Admin"));

        IQueryable<ServiceBooking> Mine(AppDb db, ClaimsPrincipal p) => db.ServiceBookings.Where(s => s.Service!.ProviderId == p.UserId());

        static object View(ServiceBooking s) => new
        {
            s.Id, s.ScheduledAt, s.Price, s.Notes, s.ProviderNote, s.Status, s.Rating, s.Comment, s.CreatedAt,
            service = new { s.Service!.Id, s.Service.Title },
            host = new { s.Host!.Id, s.Host.FullName, s.Host.Phone, s.Host.AvatarUrl },
            property = new { s.Property!.Id, s.Property.Title, s.Property.Address, s.Property.Lat, s.Property.Lng },
        };

        g.MapGet("/dashboard", async (ClaimsPrincipal p, AppDb db, PricingService pricing) =>
        {
            var commission = await pricing.Setting("providerCommissionPercent", 15);
            var now = DateTime.UtcNow;
            var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            var done = await Mine(db, p).Where(s => s.ScheduledAt >= monthStart && (s.Status == ServiceBookingStatus.Done || s.Status == ServiceBookingStatus.Confirmed))
                .Select(s => new { s.ScheduledAt, s.Price }).ToListAsync();
            var upcoming = Mine(db, p).Where(s => s.Status == ServiceBookingStatus.Accepted && s.ScheduledAt >= now.AddHours(-3));
            return new
            {
                user = (await db.Users.FindAsync(p.UserId()))!.ToDto(),
                commission,
                monthEarnings = done.Sum(s => s.Price) * (100 - commission) / 100,
                monthServices = done.Count,
                daily = Enumerable.Range(1, DateTime.DaysInMonth(now.Year, now.Month)).Select(d => new
                {
                    day = d,
                    earnings = done.Where(s => s.ScheduledAt.Day == d).Sum(s => s.Price) * (100 - commission) / 100,
                    count = done.Count(s => s.ScheduledAt.Day == d),
                }),
                pending = await Mine(db, p).CountAsync(s => s.Status == ServiceBookingStatus.Pending),
                upcomingCount = await upcoming.CountAsync(),
                next = (await upcoming.Include(s => s.Service).Include(s => s.Host).Include(s => s.Property).OrderBy(s => s.ScheduledAt).FirstOrDefaultAsync()) is { } n ? View(n) : null,
                lastReview = await Mine(db, p).Where(s => s.Rating != null).OrderByDescending(s => s.CreatedAt)
                    .Select(s => new { s.Rating, s.Comment, host = s.Host!.FullName, service = s.Service!.Title }).FirstOrDefaultAsync(),
            };
        });

        g.MapGet("/services", async (ClaimsPrincipal p, AppDb db) =>
            await db.Services.Where(s => s.ProviderId == p.UserId()).Include(s => s.Category).OrderBy(s => s.Title).ToListAsync());

        g.MapPost("/services", async (ServiceReq r, ClaimsPrincipal p, AppDb db) =>
        {
            var s = new Service { ProviderId = p.UserId() };
            Fill(s, r);
            db.Services.Add(s);
            await db.SaveChangesAsync();
            return Results.Ok(new { s.Id });
        });

        g.MapPut("/services/{id:guid}", async (Guid id, ServiceReq r, ClaimsPrincipal p, AppDb db) =>
        {
            var s = await db.Services.FirstOrDefaultAsync(s => s.Id == id && s.ProviderId == p.UserId());
            if (s == null) return Results.NotFound();
            Fill(s, r);
            await db.SaveChangesAsync();
            return Results.Ok();
        });

        g.MapDelete("/services/{id:guid}", async (Guid id, ClaimsPrincipal p, AppDb db) =>
        {
            var s = await db.Services.FirstOrDefaultAsync(s => s.Id == id && s.ProviderId == p.UserId());
            if (s == null) return Results.NotFound();
            // Services with history are deactivated instead of deleted so reports stay intact.
            if (await db.ServiceBookings.AnyAsync(b => b.ServiceId == id)) s.IsActive = false; else db.Services.Remove(s);
            await db.SaveChangesAsync();
            return Results.Ok();
        });

        g.MapGet("/bookings", async (string? status, ClaimsPrincipal p, AppDb db) =>
        {
            var q = Mine(db, p);
            q = status switch
            {
                "pending" => q.Where(s => s.Status == ServiceBookingStatus.Pending),
                "upcoming" => q.Where(s => s.Status == ServiceBookingStatus.Accepted || s.Status == ServiceBookingStatus.Arrived),
                "past" => q.Where(s => s.Status == ServiceBookingStatus.Done || s.Status == ServiceBookingStatus.Confirmed || s.Status == ServiceBookingStatus.Rejected || s.Status == ServiceBookingStatus.Cancelled),
                _ => q,
            };
            return (await q.Include(s => s.Service).Include(s => s.Host).Include(s => s.Property).OrderBy(s => s.ScheduledAt).ToListAsync()).Select(View);
        });

        g.MapPost("/bookings/{id:guid}/{action}", async (Guid id, string action, NoteReq? req, ClaimsPrincipal p, AppDb db, Notifier notify) =>
        {
            var s = await db.ServiceBookings.Include(x => x.Service).FirstOrDefaultAsync(x => x.Id == id && x.Service!.ProviderId == p.UserId());
            if (s == null) return Results.NotFound();
            (ServiceBookingStatus next, string title)? step = (action, s.Status) switch
            {
                ("accept", ServiceBookingStatus.Pending) => (ServiceBookingStatus.Accepted, "تم قبول طلب الخدمة"),
                ("reject", ServiceBookingStatus.Pending) => (ServiceBookingStatus.Rejected, "تم رفض طلب الخدمة"),
                ("arrive", ServiceBookingStatus.Accepted) => (ServiceBookingStatus.Arrived, "مقدم الخدمة وصل"),
                ("done", ServiceBookingStatus.Arrived) => (ServiceBookingStatus.Done, "تم إنجاز الخدمة — يرجى التأكيد والتقييم"),
                ("cancel", ServiceBookingStatus.Accepted) => (ServiceBookingStatus.Cancelled, "تم إلغاء الخدمة من مقدمها"),
                _ => null,
            };
            if (step is null) return Results.BadRequest(new { error = "invalid_transition" });
            var (next, title) = step.Value;
            s.Status = next;
            if (req?.Note is { Length: > 0 } note) s.ProviderNote = note;
            await db.SaveChangesAsync();
            await notify.Send(s.HostId, title, s.Service!.Title, "service", "/host/services");
            return Results.Ok(new { s.Status });
        });

        g.MapGet("/earnings", async (ClaimsPrincipal p, AppDb db, PricingService pricing) =>
        {
            var commission = await pricing.Setting("providerCommissionPercent", 15);
            var rows = await Mine(db, p).Where(s => s.Status == ServiceBookingStatus.Done || s.Status == ServiceBookingStatus.Confirmed)
                .OrderByDescending(s => s.ScheduledAt).Select(s => new { s.Id, s.ScheduledAt, s.Price, service = s.Service!.Title, host = s.Host!.FullName }).ToListAsync();
            return new
            {
                commission,
                gross = rows.Sum(r => r.Price),
                platform = rows.Sum(r => r.Price) * commission / 100,
                net = rows.Sum(r => r.Price) * (100 - commission) / 100,
                monthly = rows.GroupBy(r => r.ScheduledAt.ToString("yyyy-MM")).OrderBy(g => g.Key)
                    .Select(g => new { month = g.Key, gross = g.Sum(r => r.Price), net = g.Sum(r => r.Price) * (100 - commission) / 100 }),
                rows,
            };
        });
    }

    static void Fill(Service s, ServiceReq r)
    {
        s.CategoryId = r.CategoryId; s.Title = r.Title; s.Description = r.Description; s.Price = r.Price;
        s.DurationMinutes = r.DurationMinutes; s.ImageUrl = r.ImageUrl; s.IsActive = r.IsActive;
    }
}
