using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using MyProject.API.Data;
using MyProject.API.Services;
using NetTopologySuite.Geometries;

namespace MyProject.API.Endpoints;

public record PropertyReq(
    string Title, string Description, int CityId, int DistrictId, string Address, double Lat, double Lng,
    int TypeId, Direction Direction, int Area, int Rooms, int MasterRooms, int SingleBeds, int DoubleBeds, int Bathrooms,
    int Pools, int Capacity, decimal PricePerNight, int DiscountPercent, decimal? Deposit, bool FreeCancellation,
    string CancellationPolicy, string CheckInTime, string CheckOutTime, string? VideoUrl, List<string> Images, List<int> LookupIds);

public record ServiceBookingReq(Guid ServiceId, Guid PropertyId, DateTime ScheduledAt, string? Notes);
public record RateReq(int Rating, string? Comment);
public record ReplyReq(string Reply);

public static class HostEndpoints
{
    static void Apply(Property x, PropertyReq r, List<Lookup> lookups)
    {
        x.Title = r.Title; x.Description = r.Description; x.CityId = r.CityId; x.DistrictId = r.DistrictId; x.Address = r.Address;
        x.Lat = r.Lat; x.Lng = r.Lng; x.Location = new Point(r.Lng, r.Lat) { SRID = 4326 };
        x.TypeId = r.TypeId; x.Direction = r.Direction; x.Area = r.Area; x.Rooms = r.Rooms; x.MasterRooms = r.MasterRooms;
        x.SingleBeds = r.SingleBeds; x.DoubleBeds = r.DoubleBeds; x.Bathrooms = r.Bathrooms; x.Pools = r.Pools; x.Capacity = r.Capacity;
        x.PricePerNight = r.PricePerNight; x.DiscountPercent = Math.Clamp(r.DiscountPercent, 0, 90); x.Deposit = r.Deposit;
        x.FreeCancellation = r.FreeCancellation; x.CancellationPolicy = r.CancellationPolicy;
        x.CheckInTime = r.CheckInTime; x.CheckOutTime = r.CheckOutTime; x.VideoUrl = r.VideoUrl;
        x.Lookups = lookups;
        x.Images = r.Images.Select((u, i) => new PropertyImage { Url = u, Order = i }).ToList();
    }

    public static void MapHost(this WebApplication app)
    {
        var g = app.MapGroup("/api/host").RequireAuthorization(pol => pol.RequireRole("Host", "Admin"));

        g.MapGet("/dashboard", async (ClaimsPrincipal p, AppDb db) =>
        {
            var uid = p.UserId();
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var bookings = db.Bookings.Where(b => b.Property!.HostId == uid && b.Status != BookingStatus.Cancelled);
            var monthStart = new DateOnly(today.Year, today.Month, 1);
            var yearStart = new DateOnly(today.Year, 1, 1);
            var props = db.Properties.Where(x => x.HostId == uid);
            var since = monthStart.AddMonths(-11);
            var monthly = await bookings.Where(b => b.CheckIn >= since)
                .GroupBy(b => new { b.CheckIn.Year, b.CheckIn.Month })
                .Select(g => new { g.Key.Year, g.Key.Month, revenue = g.Sum(b => b.Subtotal), count = g.Count() }).ToListAsync();

            return new
            {
                properties = await props.CountAsync(),
                pending = await props.CountAsync(x => x.Status == PropertyStatus.Pending),
                current = await bookings.CountAsync(b => b.CheckIn <= today && b.CheckOut > today),
                upcoming = await bookings.CountAsync(b => b.CheckIn > today),
                monthRevenue = await bookings.Where(b => b.CheckIn >= monthStart).SumAsync(b => (decimal?)b.Subtotal) ?? 0,
                yearRevenue = await bookings.Where(b => b.CheckIn >= yearStart).SumAsync(b => (decimal?)b.Subtotal) ?? 0,
                rating = await props.Where(x => x.ReviewsCount > 0).AverageAsync(x => (double?)x.Rating) ?? 0,
                reviews = await props.SumAsync(x => x.ReviewsCount),
                monthly = Enumerable.Range(0, 12).Select(i => since.AddMonths(i)).Select(d => new
                {
                    month = $"{d.Year}-{d.Month:00}",
                    revenue = monthly.FirstOrDefault(m => m.Year == d.Year && m.Month == d.Month)?.revenue ?? 0,
                    count = monthly.FirstOrDefault(m => m.Year == d.Year && m.Month == d.Month)?.count ?? 0,
                }),
                next = (await bookings.Where(b => b.CheckIn >= today).WithDetails().OrderBy(b => b.CheckIn).Take(5).ToListAsync()).Select(GuestEndpoints.BookingView),
                notifications = await db.Notifications.Where(n => n.UserId == uid).OrderByDescending(n => n.CreatedAt).Take(5).ToListAsync(),
            };
        });

        g.MapGet("/properties", async (ClaimsPrincipal p, AppDb db) =>
            await db.Properties.Where(x => x.HostId == p.UserId()).OrderByDescending(x => x.CreatedAt).Select(Map.Card).ToListAsync());

        g.MapGet("/properties/{id:guid}", async (Guid id, ClaimsPrincipal p, AppDb db) =>
        {
            var x = await db.Properties.Include(x => x.Images).Include(x => x.Lookups).FirstOrDefaultAsync(x => x.Id == id && x.HostId == p.UserId());
            if (x == null) return Results.NotFound();
            return Results.Ok(new
            {
                x.Id, x.Code, x.Title, x.Description, x.CityId, x.DistrictId, x.Address, x.Lat, x.Lng, x.TypeId, x.Direction, x.Area,
                x.Rooms, x.MasterRooms, x.SingleBeds, x.DoubleBeds, x.Bathrooms, x.Pools, x.Capacity, x.PricePerNight, x.DiscountPercent,
                x.Deposit, x.FreeCancellation, x.CancellationPolicy, x.CheckInTime, x.CheckOutTime, x.VideoUrl, x.Status,
                images = x.Images.OrderBy(i => i.Order).Select(i => i.Url), lookupIds = x.Lookups.Select(l => l.Id),
            });
        });

        g.MapPost("/properties", async (PropertyReq r, ClaimsPrincipal p, AppDb db, Notifier notify) =>
        {
            var x = new Property { HostId = p.UserId(), Code = $"DY{Random.Shared.Next(10000, 99999)}", Status = PropertyStatus.Pending };
            Apply(x, r, await db.Lookups.Where(l => r.LookupIds.Contains(l.Id)).ToListAsync());
            db.Properties.Add(x);
            await db.SaveChangesAsync();
            foreach (var admin in await db.Users.Where(u => u.Role == UserRole.Admin).Select(u => u.Id).ToListAsync())
                await notify.Send(admin, "عقار جديد بانتظار المراجعة", $"{x.Title} ({x.Code})", "property", "/admin/properties");
            return Results.Ok(new { x.Id, x.Code });
        });

        g.MapPut("/properties/{id:guid}", async (Guid id, PropertyReq r, ClaimsPrincipal p, AppDb db) =>
        {
            var x = await db.Properties.Include(x => x.Images).Include(x => x.Lookups).FirstOrDefaultAsync(x => x.Id == id && x.HostId == p.UserId());
            if (x == null) return Results.NotFound();
            db.PropertyImages.RemoveRange(x.Images);
            Apply(x, r, await db.Lookups.Where(l => r.LookupIds.Contains(l.Id)).ToListAsync());
            if (x.Status == PropertyStatus.Rejected) x.Status = PropertyStatus.Pending;
            await db.SaveChangesAsync();
            return Results.Ok();
        });

        g.MapPost("/properties/{id:guid}/toggle-hidden", async (Guid id, ClaimsPrincipal p, AppDb db) =>
        {
            var x = await db.Properties.FirstOrDefaultAsync(x => x.Id == id && x.HostId == p.UserId());
            if (x == null) return Results.NotFound();
            if (x.Status is PropertyStatus.Approved) x.Status = PropertyStatus.Hidden;
            else if (x.Status is PropertyStatus.Hidden) x.Status = PropertyStatus.Approved;
            await db.SaveChangesAsync();
            return Results.Ok(new { x.Status });
        });

        g.MapDelete("/properties/{id:guid}", async (Guid id, ClaimsPrincipal p, AppDb db) =>
        {
            var x = await db.Properties.FirstOrDefaultAsync(x => x.Id == id && x.HostId == p.UserId());
            if (x == null) return Results.NotFound();
            if (await db.Bookings.AnyAsync(b => b.PropertyId == id && b.Status == BookingStatus.Confirmed))
                return Results.Conflict(new { error = "has_active_bookings" });
            db.Properties.Remove(x);
            await db.SaveChangesAsync();
            return Results.Ok();
        });

        g.MapGet("/bookings", async (string? status, string? q, ClaimsPrincipal p, AppDb db) =>
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var list = db.Bookings.Where(b => b.Property!.HostId == p.UserId());
            list = status switch
            {
                "current" => list.Where(b => b.Status != BookingStatus.Cancelled && b.CheckIn <= today && b.CheckOut > today),
                "upcoming" => list.Where(b => b.Status != BookingStatus.Cancelled && b.CheckIn > today),
                "past" => list.Where(b => b.CheckOut <= today || b.Status == BookingStatus.Cancelled),
                _ => list,
            };
            if (!string.IsNullOrWhiteSpace(q)) list = list.Where(b => EF.Functions.ILike(b.Guest!.FullName, $"%{q}%") || b.Code.Contains(q.ToUpper()));
            return (await list.WithDetails().OrderByDescending(b => b.CheckIn).ToListAsync()).Select(GuestEndpoints.BookingView);
        });

        // Handover: host confirms the guest received the unit, later marks the stay complete.
        g.MapPost("/bookings/{id:guid}/{action}", async (Guid id, string action, ClaimsPrincipal p, AppDb db, Notifier notify) =>
        {
            var b = await db.Bookings.Include(x => x.Property).FirstOrDefaultAsync(x => x.Id == id && x.Property!.HostId == p.UserId());
            if (b == null) return Results.NotFound();
            switch (action)
            {
                case "checkin" when b.Status == BookingStatus.Confirmed:
                    b.Status = BookingStatus.CheckedIn;
                    await notify.Send(b.GuestId, "تم تسليم الوحدة", $"أهلاً بك في {b.Property!.Title}! نتمنى لك إقامة سعيدة.", "booking", "/bookings");
                    break;
                case "complete" when b.Status == BookingStatus.CheckedIn:
                    b.Status = BookingStatus.Completed;
                    await notify.Send(b.GuestId, "كيف كانت إقامتك؟", $"شاركنا تقييمك لـ {b.Property!.Title}", "review", "/bookings");
                    break;
                default: return Results.BadRequest(new { error = "invalid_transition" });
            }
            await db.SaveChangesAsync();
            return Results.Ok(new { b.Status });
        });

        g.MapGet("/reports", async (DateOnly? from, DateOnly? to, Guid? propertyId, ClaimsPrincipal p, AppDb db) =>
        {
            var uid = p.UserId();
            var start = from ?? DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(-11)).AddDays(1 - DateTime.UtcNow.Day);
            var end = to ?? DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(1));
            var props = await db.Properties.Where(x => x.HostId == uid && (propertyId == null || x.Id == propertyId)).Select(x => new { x.Id, x.Title, x.Code }).ToListAsync();
            var ids = props.Select(x => x.Id).ToList();
            var bookings = await db.Bookings.Where(b => ids.Contains(b.PropertyId) && b.Status != BookingStatus.Cancelled && b.CheckIn < end && b.CheckOut > start).ToListAsync();
            var services = await db.ServiceBookings.Include(s => s.Service).Where(s => ids.Contains(s.PropertyId) && s.ScheduledAt >= start.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc)
                && s.ScheduledAt < end.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc)
                && (s.Status == ServiceBookingStatus.Done || s.Status == ServiceBookingStatus.Confirmed)).ToListAsync();
            var days = end.DayNumber - start.DayNumber;

            return new
            {
                from = start, to = end,
                revenue = bookings.Sum(b => b.Subtotal),
                serviceDeductions = services.Sum(s => s.Price),
                net = bookings.Sum(b => b.Subtotal) - services.Sum(s => s.Price),
                bookings = bookings.Count,
                byProperty = props.Select(x =>
                {
                    var bs = bookings.Where(b => b.PropertyId == x.Id).ToList();
                    var nights = bs.Sum(b => Math.Min(b.CheckOut.DayNumber, end.DayNumber) - Math.Max(b.CheckIn.DayNumber, start.DayNumber));
                    return new
                    {
                        x.Id, x.Title, x.Code, revenue = bs.Sum(b => b.Subtotal), bookings = bs.Count, nights,
                        occupancy = days > 0 ? Math.Round(100.0 * nights / days, 1) : 0,
                        deductions = services.Where(s => s.PropertyId == x.Id).Sum(s => s.Price),
                    };
                }),
                monthly = bookings.GroupBy(b => $"{b.CheckIn.Year}-{b.CheckIn.Month:00}").OrderBy(g => g.Key)
                    .Select(g => new { month = g.Key, revenue = g.Sum(b => b.Subtotal), bookings = g.Count() }),
                deductions = services.Select(s => new { s.Id, s.Service!.Title, s.Price, s.ScheduledAt, s.PropertyId }),
            };
        });

        g.MapGet("/reviews", async (ClaimsPrincipal p, AppDb db) =>
            await db.Reviews.Where(r => db.Properties.Any(x => x.Id == r.PropertyId && x.HostId == p.UserId()))
                .OrderByDescending(r => r.CreatedAt).Select(r => new
                {
                    r.Id, r.Overall, r.Comment, r.HostReply, r.CreatedAt, guest = r.Guest!.FullName,
                    property = db.Properties.Where(x => x.Id == r.PropertyId).Select(x => x.Title).FirstOrDefault(),
                }).ToListAsync());

        g.MapPost("/reviews/{id:int}/reply", async (int id, ReplyReq req, ClaimsPrincipal p, AppDb db) =>
        {
            var r = await db.Reviews.FirstOrDefaultAsync(r => r.Id == id && db.Properties.Any(x => x.Id == r.PropertyId && x.HostId == p.UserId()));
            if (r == null) return Results.NotFound();
            r.HostReply = req.Reply;
            await db.SaveChangesAsync();
            return Results.Ok();
        });

        // ---- Service requests (cleaning, maintenance…) from providers ----
        g.MapGet("/service-bookings", async (ClaimsPrincipal p, AppDb db) =>
            await db.ServiceBookings.Where(s => s.HostId == p.UserId()).OrderByDescending(s => s.ScheduledAt).Select(s => new
            {
                s.Id, s.ScheduledAt, s.Price, s.Notes, s.ProviderNote, s.Status, s.Rating, s.Comment,
                service = new { s.Service!.Id, s.Service.Title, s.Service.ImageUrl },
                provider = new { s.Service.Provider!.Id, s.Service.Provider.FullName, s.Service.Provider.AvatarUrl, s.Service.Provider.Phone },
                property = new { s.Property!.Id, s.Property.Title },
            }).ToListAsync());

        g.MapPost("/service-bookings", async (ServiceBookingReq req, ClaimsPrincipal p, AppDb db, Notifier notify) =>
        {
            var uid = p.UserId();
            var service = await db.Services.FindAsync(req.ServiceId);
            if (service == null || !await db.Properties.AnyAsync(x => x.Id == req.PropertyId && x.HostId == uid)) return Results.NotFound();
            var sb = new ServiceBooking { ServiceId = service.Id, HostId = uid, PropertyId = req.PropertyId, ScheduledAt = req.ScheduledAt.ToUniversalTime(), Notes = req.Notes, Price = service.Price };
            db.ServiceBookings.Add(sb);
            await db.SaveChangesAsync();
            await notify.Send(service.ProviderId, "طلب خدمة جديد", $"{service.Title} بتاريخ {sb.ScheduledAt:yyyy-MM-dd HH:mm}", "service", "/provider/bookings");
            return Results.Ok(new { sb.Id });
        });

        g.MapPost("/service-bookings/{id:guid}/cancel", async (Guid id, ClaimsPrincipal p, AppDb db, Notifier notify) =>
        {
            var sb = await db.ServiceBookings.Include(s => s.Service).FirstOrDefaultAsync(s => s.Id == id && s.HostId == p.UserId());
            if (sb == null) return Results.NotFound();
            if (sb.Status is not (ServiceBookingStatus.Pending or ServiceBookingStatus.Accepted)) return Results.BadRequest(new { error = "cannot_cancel" });
            sb.Status = ServiceBookingStatus.Cancelled;
            await db.SaveChangesAsync();
            await notify.Send(sb.Service!.ProviderId, "إلغاء طلب خدمة", $"تم إلغاء طلب {sb.Service.Title}", "service", "/provider/bookings");
            return Results.Ok();
        });

        g.MapPost("/service-bookings/{id:guid}/reschedule", async (Guid id, ServiceBookingReq req, ClaimsPrincipal p, AppDb db) =>
        {
            var sb = await db.ServiceBookings.FirstOrDefaultAsync(s => s.Id == id && s.HostId == p.UserId());
            if (sb == null) return Results.NotFound();
            if (sb.Status is not (ServiceBookingStatus.Pending or ServiceBookingStatus.Accepted)) return Results.BadRequest(new { error = "cannot_change" });
            sb.ScheduledAt = req.ScheduledAt.ToUniversalTime(); sb.Status = ServiceBookingStatus.Pending;
            await db.SaveChangesAsync();
            return Results.Ok();
        });

        // Host confirms the provider finished the job and rates it; the price is deducted from rental income.
        g.MapPost("/service-bookings/{id:guid}/confirm", async (Guid id, RateReq req, ClaimsPrincipal p, AppDb db) =>
        {
            var sb = await db.ServiceBookings.Include(s => s.Service).FirstOrDefaultAsync(s => s.Id == id && s.HostId == p.UserId());
            if (sb == null) return Results.NotFound();
            if (sb.Status != ServiceBookingStatus.Done) return Results.BadRequest(new { error = "not_done" });
            sb.Status = ServiceBookingStatus.Confirmed; sb.Rating = Math.Clamp(req.Rating, 1, 5); sb.Comment = req.Comment;
            await db.SaveChangesAsync();
            var svc = sb.Service!;
            var rated = db.ServiceBookings.Where(s => s.ServiceId == svc.Id && s.Rating != null);
            svc.ReviewsCount = await rated.CountAsync();
            svc.Rating = Math.Round(await rated.AverageAsync(s => (double)s.Rating!), 1);
            await db.SaveChangesAsync();
            return Results.Ok();
        });
    }
}
