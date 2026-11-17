using Microsoft.EntityFrameworkCore;
using MyProject.API.Data;
using MyProject.API.Services;

namespace MyProject.API.Endpoints;

public record StatusReq(PropertyStatus Status, string? Reason);
public record BroadcastReq(string Title, string Body, UserRole? Role);
public record NameReq(string NameAr, string NameEn, string? Icon, string? ImageUrl, int? Min, int? Max, LookupKind? Kind, int? CityId);
public record OfferReq(string Kind, string Title, string Subtitle, string ImageUrl, string? Badge, string? Link, bool IsActive, int Order);
public record CreateUserReq(string FullName, string Phone, string? Email, UserRole Role);

public static class AdminEndpoints
{
    public static void MapAdmin(this WebApplication app)
    {
        var g = app.MapGroup("/api/admin").RequireAuthorization(pol => pol.RequireRole("Admin"));

        g.MapGet("/stats", async (AppDb db) =>
        {
            var since = DateOnly.FromDateTime(DateTime.UtcNow).AddMonths(-11);
            since = new DateOnly(since.Year, since.Month, 1);
            var active = db.Bookings.Where(b => b.Status != BookingStatus.Cancelled);
            var monthly = await active.Where(b => b.CheckIn >= since).GroupBy(b => new { b.CheckIn.Year, b.CheckIn.Month })
                .Select(g => new { g.Key.Year, g.Key.Month, gmv = g.Sum(b => b.Subtotal), fees = g.Sum(b => b.ServiceFee), count = g.Count() }).ToListAsync();
            return new
            {
                users = await db.Users.GroupBy(u => u.Role).Select(g => new { role = g.Key.ToString(), count = g.Count() }).ToListAsync(),
                properties = await db.Properties.GroupBy(p => p.Status).Select(g => new { status = g.Key.ToString(), count = g.Count() }).ToListAsync(),
                bookings = await active.CountAsync(),
                gmv = await active.SumAsync(b => (decimal?)b.Subtotal) ?? 0,
                fees = await active.SumAsync(b => (decimal?)b.ServiceFee) ?? 0,
                openTickets = await db.Tickets.CountAsync(t => t.Status == TicketStatus.Open),
                pendingServices = await db.ServiceBookings.CountAsync(s => s.Status == ServiceBookingStatus.Pending),
                monthly = Enumerable.Range(0, 12).Select(i => since.AddMonths(i)).Select(d =>
                {
                    var m = monthly.FirstOrDefault(x => x.Year == d.Year && x.Month == d.Month);
                    return new { month = $"{d.Year}-{d.Month:00}", gmv = m?.gmv ?? 0, fees = m?.fees ?? 0, count = m?.count ?? 0 };
                }),
                byCity = await db.Cities.Select(c => new { name = c.NameAr, nameEn = c.NameEn, count = db.Bookings.Count(b => b.Property!.CityId == c.Id) }).ToListAsync(),
                latest = (await db.Bookings.WithDetails().OrderByDescending(b => b.CreatedAt).Take(8).ToListAsync()).Select(GuestEndpoints.BookingView),
            };
        });

        // ---- Users of every app ----
        g.MapGet("/users", async (UserRole? role, string? q, AppDb db) =>
        {
            var u = db.Users.AsQueryable();
            if (role is { } r) u = u.Where(x => x.Role == r);
            if (!string.IsNullOrWhiteSpace(q)) u = u.Where(x => EF.Functions.ILike(x.FullName, $"%{q}%") || x.Phone.Contains(q) || (x.Email != null && x.Email.Contains(q)));
            return await u.OrderByDescending(x => x.CreatedAt).Take(500).Select(x => new
            {
                x.Id, x.FullName, x.Phone, x.Email, x.Role, x.AvatarUrl, x.IsActive, x.CreatedAt,
                bookings = db.Bookings.Count(b => b.GuestId == x.Id),
                properties = db.Properties.Count(p => p.HostId == x.Id),
                services = db.Services.Count(s => s.ProviderId == x.Id),
            }).ToListAsync();
        });

        g.MapPost("/users", async (CreateUserReq r, AppDb db) =>
        {
            var phone = new string(r.Phone.Where(char.IsDigit).ToArray());
            if (await db.Users.AnyAsync(u => u.Phone == phone)) return Results.Conflict(new { error = "already_registered" });
            var u = new User { FullName = r.FullName, Phone = phone, Email = r.Email, Role = r.Role };
            db.Users.Add(u);
            await db.SaveChangesAsync();
            return Results.Ok(u.ToDto());
        });

        g.MapPost("/users/{id:guid}/toggle", async (Guid id, AppDb db) =>
        {
            var u = await db.Users.FindAsync(id);
            if (u == null) return Results.NotFound();
            u.IsActive = !u.IsActive;
            await db.SaveChangesAsync();
            return Results.Ok(new { u.IsActive });
        });

        g.MapPost("/users/{id:guid}/role/{role}", async (Guid id, UserRole role, AppDb db) =>
        {
            var u = await db.Users.FindAsync(id);
            if (u == null) return Results.NotFound();
            u.Role = role;
            await db.SaveChangesAsync();
            return Results.Ok();
        });

        // ---- Property moderation ----
        g.MapGet("/properties", async (PropertyStatus? status, string? q, AppDb db) =>
        {
            var p = db.Properties.AsQueryable();
            if (status is { } s) p = p.Where(x => x.Status == s);
            if (!string.IsNullOrWhiteSpace(q)) p = p.Where(x => EF.Functions.ILike(x.Title, $"%{q}%") || x.Code.Contains(q.ToUpper()));
            return await p.OrderByDescending(x => x.CreatedAt).Take(500).Select(x => new
            {
                card = new { x.Id, x.Code, x.Title, image = x.Images.OrderBy(i => i.Order).Select(i => i.Url).FirstOrDefault(), x.Status, x.IsFeatured, x.LocationGuaranteed, x.PricePerNight, x.Rating, x.CreatedAt },
                host = new { x.Host!.Id, x.Host.FullName, x.Host.Phone },
                city = x.City!.NameAr, type = x.Type!.NameAr,
            }).ToListAsync();
        });

        g.MapPost("/properties/{id:guid}/status", async (Guid id, StatusReq r, AppDb db, Notifier notify) =>
        {
            var p = await db.Properties.FindAsync(id);
            if (p == null) return Results.NotFound();
            p.Status = r.Status;
            await db.SaveChangesAsync();
            var msg = r.Status switch
            {
                PropertyStatus.Approved => ("تمت الموافقة على عقارك ✅", $"{p.Title} أصبح ظاهراً للزوار الآن"),
                PropertyStatus.Rejected => ("تم رفض العقار", $"{p.Title}: {r.Reason}"),
                _ => ("تحديث حالة العقار", p.Title),
            };
            await notify.Send(p.HostId, msg.Item1, msg.Item2, "property", "/host/properties");
            return Results.Ok();
        });

        g.MapPost("/properties/{id:guid}/{flag}", async (Guid id, string flag, AppDb db) =>
        {
            var p = await db.Properties.FindAsync(id);
            if (p == null) return Results.NotFound();
            if (flag == "featured") p.IsFeatured = !p.IsFeatured;
            else if (flag == "guarantee") p.LocationGuaranteed = !p.LocationGuaranteed;
            else return Results.BadRequest();
            await db.SaveChangesAsync();
            return Results.Ok(new { p.IsFeatured, p.LocationGuaranteed });
        });

        g.MapDelete("/properties/{id:guid}", async (Guid id, AppDb db) =>
        {
            await db.Properties.Where(p => p.Id == id).ExecuteDeleteAsync();
            return Results.Ok();
        });

        g.MapGet("/bookings", async (BookingStatus? status, AppDb db) =>
        {
            var b = db.Bookings.AsQueryable();
            if (status is { } s) b = b.Where(x => x.Status == s);
            return (await b.WithDetails().OrderByDescending(x => x.CreatedAt).Take(300).ToListAsync()).Select(GuestEndpoints.BookingView);
        });

        // ---- Services marketplace ----
        g.MapGet("/services", async (AppDb db) =>
            await db.Services.Include(s => s.Category).Include(s => s.Provider).OrderBy(s => s.Title).Select(s => new
            {
                s.Id, s.Title, s.Price, s.IsActive, s.Rating, s.ReviewsCount, s.ImageUrl, category = s.Category!.NameAr, provider = s.Provider!.FullName,
                bookings = db.ServiceBookings.Count(b => b.ServiceId == s.Id),
            }).ToListAsync());

        g.MapPost("/services/{id:guid}/toggle", async (Guid id, AppDb db) =>
        {
            var s = await db.Services.FindAsync(id);
            if (s == null) return Results.NotFound();
            s.IsActive = !s.IsActive;
            await db.SaveChangesAsync();
            return Results.Ok(new { s.IsActive });
        });

        g.MapGet("/service-bookings", async (AppDb db) =>
            await db.ServiceBookings.OrderByDescending(s => s.CreatedAt).Take(300).Select(s => new
            {
                s.Id, s.ScheduledAt, s.Price, s.Status, s.ProviderNote, s.Rating, service = s.Service!.Title,
                provider = s.Service.Provider!.FullName, host = s.Host!.FullName, property = s.Property!.Title,
            }).ToListAsync());

        // ---- Catalog: cities, districts, types and every lookup list ----
        g.MapPost("/cities", async (NameReq r, AppDb db) => { var c = new City { NameAr = r.NameAr, NameEn = r.NameEn, ImageUrl = r.ImageUrl }; db.Cities.Add(c); await db.SaveChangesAsync(); return c; });
        g.MapPut("/cities/{id:int}", async (int id, NameReq r, AppDb db) => { var c = (await db.Cities.FindAsync(id))!; c.NameAr = r.NameAr; c.NameEn = r.NameEn; c.ImageUrl = r.ImageUrl; await db.SaveChangesAsync(); return c; });
        g.MapPost("/districts", async (NameReq r, AppDb db) => { var d = new District { CityId = r.CityId!.Value, NameAr = r.NameAr, NameEn = r.NameEn }; db.Districts.Add(d); await db.SaveChangesAsync(); return d; });
        g.MapPost("/types", async (NameReq r, AppDb db) => { var t = new PropertyType { NameAr = r.NameAr, NameEn = r.NameEn, Icon = r.Icon ?? "home" }; db.PropertyTypes.Add(t); await db.SaveChangesAsync(); return t; });
        g.MapPut("/types/{id:int}", async (int id, NameReq r, AppDb db) => { var t = (await db.PropertyTypes.FindAsync(id))!; t.NameAr = r.NameAr; t.NameEn = r.NameEn; t.Icon = r.Icon ?? t.Icon; await db.SaveChangesAsync(); return t; });
        g.MapPost("/lookups", async (NameReq r, AppDb db) => { var l = new Lookup { Kind = r.Kind!.Value, NameAr = r.NameAr, NameEn = r.NameEn, Icon = r.Icon, Min = r.Min, Max = r.Max }; db.Lookups.Add(l); await db.SaveChangesAsync(); return l; });
        g.MapPut("/lookups/{id:int}", async (int id, NameReq r, AppDb db) => { var l = (await db.Lookups.FindAsync(id))!; l.NameAr = r.NameAr; l.NameEn = r.NameEn; l.Icon = r.Icon; l.Min = r.Min; l.Max = r.Max; await db.SaveChangesAsync(); return l; });

        g.MapDelete("/{kind}/{id:int}", async (string kind, int id, AppDb db) =>
        {
            try
            {
                var n = kind switch
                {
                    "cities" => await db.Cities.Where(x => x.Id == id).ExecuteDeleteAsync(),
                    "districts" => await db.Districts.Where(x => x.Id == id).ExecuteDeleteAsync(),
                    "types" => await db.PropertyTypes.Where(x => x.Id == id).ExecuteDeleteAsync(),
                    "lookups" => await db.Lookups.Where(x => x.Id == id).ExecuteDeleteAsync(),
                    "offers" => await db.Offers.Where(x => x.Id == id).ExecuteDeleteAsync(),
                    _ => -1,
                };
                return n < 0 ? Results.NotFound() : Results.Ok();
            }
            catch (DbUpdateException) { return Results.Conflict(new { error = "in_use" }); }
            catch (Npgsql.PostgresException) { return Results.Conflict(new { error = "in_use" }); }
        });

        // ---- Hero slides & featured offers ----
        g.MapGet("/offers", async (AppDb db) => await db.Offers.OrderBy(o => o.Kind).ThenBy(o => o.Order).ToListAsync());
        g.MapPost("/offers", async (OfferReq r, AppDb db) => { var o = new Offer(); FillOffer(o, r); db.Offers.Add(o); await db.SaveChangesAsync(); return o; });
        g.MapPut("/offers/{id:int}", async (int id, OfferReq r, AppDb db) => { var o = (await db.Offers.FindAsync(id))!; FillOffer(o, r); await db.SaveChangesAsync(); return o; });

        // ---- Notifications ----
        g.MapPost("/notifications", async (BroadcastReq r, AppDb db, Notifier notify) =>
        {
            var ids = await db.Users.Where(u => u.IsActive && (r.Role == null || u.Role == r.Role)).Select(u => u.Id).ToListAsync();
            foreach (var id in ids) await notify.Send(id, r.Title, r.Body, "promo");
            return Results.Ok(new { sent = ids.Count });
        });

        // ---- Support tickets ----
        g.MapGet("/tickets", async (AppDb db) =>
            await db.Tickets.OrderBy(t => t.Status).ThenByDescending(t => t.CreatedAt).Select(t => new
            {
                t.Id, t.Subject, t.Message, t.Reply, t.Status, t.CreatedAt, user = new { t.User!.Id, t.User.FullName, t.User.Phone, t.User.Role },
            }).ToListAsync());

        g.MapPost("/tickets/{id:int}/reply", async (int id, ReplyReq r, AppDb db, Notifier notify) =>
        {
            var t = await db.Tickets.FindAsync(id);
            if (t == null) return Results.NotFound();
            t.Reply = r.Reply; t.Status = TicketStatus.Answered;
            await db.SaveChangesAsync();
            await notify.Send(t.UserId, "رد على تذكرة الدعم", t.Subject, "support", "/support");
            return Results.Ok();
        });

        g.MapPost("/tickets/{id:int}/close", async (int id, AppDb db) =>
        {
            await db.Tickets.Where(t => t.Id == id).ExecuteUpdateAsync(s => s.SetProperty(t => t.Status, TicketStatus.Closed));
            return Results.Ok();
        });

        // ---- Platform settings (fees, ranges, site texts) ----
        g.MapGet("/settings", async (AppDb db) => await db.Settings.OrderBy(s => s.Key).ToListAsync());
        g.MapPut("/settings", async (Dictionary<string, string> values, AppDb db) =>
        {
            foreach (var (k, v) in values)
            {
                var s = await db.Settings.FindAsync(k);
                if (s == null) db.Settings.Add(new Setting { Key = k, Value = v }); else s.Value = v;
            }
            await db.SaveChangesAsync();
            return Results.Ok();
        });
    }

    static void FillOffer(Offer o, OfferReq r)
    {
        o.Kind = r.Kind; o.Title = r.Title; o.Subtitle = r.Subtitle; o.ImageUrl = r.ImageUrl; o.Badge = r.Badge;
        o.Link = r.Link; o.IsActive = r.IsActive; o.Order = r.Order;
    }
}
