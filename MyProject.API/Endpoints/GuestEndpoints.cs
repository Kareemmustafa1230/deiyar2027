using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using MyProject.API.Data;
using MyProject.API.Services;

namespace MyProject.API.Endpoints;

public record CreateBookingReq(Guid PropertyId, DateOnly CheckIn, DateOnly CheckOut, int Guests, PaymentMethod PaymentMethod, string? Notes);
public record ChangeDatesReq(DateOnly CheckIn, DateOnly CheckOut);
public record ExtendReq(int Nights);
public record ReviewReq(int Overall, int Accuracy, int Cleanliness, int Facilities, int HostScore, string Comment);
public record TicketReq(string Subject, string Message);
public record MessageReq(Guid To, Guid? PropertyId, string Body);

public static class GuestEndpoints
{
    public static object BookingView(Booking b) => new
    {
        b.Id, b.Code, b.CheckIn, b.CheckOut, b.Nights, b.Guests, b.NightPrice, b.Subtotal, b.ServiceFee, b.Vat, b.Deposit,
        b.ExtraFees, b.Total, b.Refund, b.PaymentMethod, b.Status, b.Notes, b.CreatedAt,
        property = b.Property == null ? null : new
        {
            b.Property.Id, b.Property.Code, b.Property.Title, b.Property.Address, b.Property.CheckInTime, b.Property.CheckOutTime,
            b.Property.FreeCancellation, b.Property.CancellationPolicy, b.Property.Lat, b.Property.Lng,
            image = b.Property.Images.OrderBy(i => i.Order).Select(i => i.Url).FirstOrDefault(),
            city = b.Property.City == null ? null : new Name(b.Property.City.NameAr, b.Property.City.NameEn),
            host = b.Property.Host == null ? null : new { b.Property.Host.Id, b.Property.Host.FullName, b.Property.Host.Phone },
        },
        guest = b.Guest == null ? null : new { b.Guest.Id, b.Guest.FullName, b.Guest.Phone, b.Guest.AvatarUrl },
    };

    public static IQueryable<Booking> WithDetails(this IQueryable<Booking> q) =>
        q.Include(b => b.Property).ThenInclude(p => p!.Images)
         .Include(b => b.Property).ThenInclude(p => p!.City)
         .Include(b => b.Property).ThenInclude(p => p!.Host)
         .Include(b => b.Guest).AsSplitQuery();

    public static void MapGuest(this WebApplication app)
    {
        var g = app.MapGroup("/api").RequireAuthorization();

        g.MapGet("/favorites", async (ClaimsPrincipal p, AppDb db) =>
            await db.Favorites.Where(f => f.UserId == p.UserId()).OrderByDescending(f => f.CreatedAt).Select(f => f.Property!).Select(Map.Card).ToListAsync());

        g.MapPost("/favorites/{id:guid}", async (Guid id, ClaimsPrincipal p, AppDb db) =>
        {
            var uid = p.UserId();
            var f = await db.Favorites.FindAsync(uid, id);
            if (f != null) db.Favorites.Remove(f); else db.Favorites.Add(new Favorite { UserId = uid, PropertyId = id });
            await db.SaveChangesAsync();
            return new { isFavorite = f == null };
        });

        g.MapPost("/bookings", async (CreateBookingReq req, ClaimsPrincipal p, AppDb db, PricingService pricing, Notifier notify) =>
        {
            var user = (await db.Users.FindAsync(p.UserId()))!;
            var prop = await db.Properties.FindAsync(req.PropertyId);
            if (prop == null || prop.Status != PropertyStatus.Approved) return Results.NotFound();
            if (req.CheckOut <= req.CheckIn || req.CheckIn < DateOnly.FromDateTime(DateTime.UtcNow)) return Results.BadRequest(new { error = "invalid_dates" });
            if (req.Guests > prop.Capacity) return Results.BadRequest(new { error = "over_capacity" });
            if (!await pricing.IsAvailable(prop.Id, req.CheckIn, req.CheckOut)) return Results.Conflict(new { error = "not_available" });

            var q = await pricing.QuoteAsync(prop, req.CheckIn, req.CheckOut);
            // Payment gateway (Moyasar/HyperPay, Tamara, Tabby) is stubbed: bookings are marked paid & confirmed immediately.
            var b = new Booking
            {
                Code = $"BK{DateTime.UtcNow:yyMMdd}{Random.Shared.Next(100000, 999999)}", PropertyId = prop.Id, GuestId = user.Id,
                CheckIn = req.CheckIn, CheckOut = req.CheckOut, Guests = req.Guests, NightPrice = q.NightPrice, Subtotal = q.Subtotal,
                ServiceFee = q.ServiceFee, Vat = q.Vat, Deposit = q.Deposit, Total = q.Total, PaymentMethod = req.PaymentMethod,
                Notes = req.Notes, Status = BookingStatus.Confirmed,
            };
            db.Bookings.Add(b);
            await db.SaveChangesAsync();
            await notify.Send(user.Id, "تم تأكيد حجزك 🎉", $"حجز {b.Code} في {prop.Title} من {b.CheckIn} إلى {b.CheckOut}", "booking", "/bookings");
            await notify.Send(prop.HostId, "حجز جديد", $"{user.FullName} حجز {prop.Title} ({b.Nights} ليالي)", "booking", "/host/bookings");
            return Results.Ok(new { b.Id, b.Code });
        });

        g.MapGet("/bookings", async (ClaimsPrincipal p, AppDb db) =>
            (await db.Bookings.Where(b => b.GuestId == p.UserId()).WithDetails().OrderByDescending(b => b.CheckIn).ToListAsync()).Select(BookingView));

        g.MapGet("/bookings/{id:guid}", async (Guid id, ClaimsPrincipal p, AppDb db) =>
            await db.Bookings.WithDetails().FirstOrDefaultAsync(b => b.Id == id && (b.GuestId == p.UserId() || b.Property!.HostId == p.UserId()))
                is { } b ? Results.Ok(BookingView(b)) : Results.NotFound());

        g.MapPost("/bookings/{id:guid}/cancel", async (Guid id, ClaimsPrincipal p, AppDb db, Notifier notify) =>
        {
            var b = await db.Bookings.Include(x => x.Property).FirstOrDefaultAsync(x => x.Id == id && x.GuestId == p.UserId());
            if (b == null) return Results.NotFound();
            if (b.Status is not BookingStatus.Confirmed) return Results.BadRequest(new { error = "cannot_cancel" });
            // Free cancellation → full refund until 48h before check-in; otherwise only the deposit is refunded.
            var hoursLeft = (b.CheckIn.ToDateTime(TimeOnly.MinValue) - DateTime.UtcNow).TotalHours;
            b.Refund = b.Property!.FreeCancellation && hoursLeft >= 48 ? b.Total : b.Deposit;
            b.Status = BookingStatus.Cancelled;
            await db.SaveChangesAsync();
            await notify.Send(b.GuestId, "تم إلغاء الحجز", $"تم إلغاء الحجز {b.Code}. المبلغ المسترد: {b.Refund:0.##} ر.س", "booking", "/bookings");
            await notify.Send(b.Property.HostId, "إلغاء حجز", $"تم إلغاء الحجز {b.Code} على {b.Property.Title}", "booking", "/host/bookings");
            return Results.Ok(new { b.Refund });
        });

        g.MapPost("/bookings/{id:guid}/change-dates", async (Guid id, ChangeDatesReq req, ClaimsPrincipal p, AppDb db, PricingService pricing, Notifier notify) =>
        {
            var b = await db.Bookings.Include(x => x.Property).FirstOrDefaultAsync(x => x.Id == id && x.GuestId == p.UserId());
            if (b == null) return Results.NotFound();
            if (b.Status != BookingStatus.Confirmed) return Results.BadRequest(new { error = "cannot_change" });
            if (!await pricing.IsAvailable(b.PropertyId, req.CheckIn, req.CheckOut, b.Id)) return Results.Conflict(new { error = "not_available" });
            var changeFee = await pricing.Setting("changeFee", 50);
            var q = await pricing.QuoteAsync(b.Property!, req.CheckIn, req.CheckOut);
            b.CheckIn = req.CheckIn; b.CheckOut = req.CheckOut; b.Subtotal = q.Subtotal; b.ServiceFee = q.ServiceFee; b.Vat = q.Vat;
            b.ExtraFees += changeFee; b.Total = q.Subtotal + q.ServiceFee + q.Vat + b.Deposit + b.ExtraFees;
            await db.SaveChangesAsync();
            await notify.Send(b.GuestId, "تم تعديل موعد الحجز", $"الموعد الجديد للحجز {b.Code}: {b.CheckIn} → {b.CheckOut}", "booking", "/bookings");
            await notify.Send(b.Property!.HostId, "تعديل موعد حجز", $"الحجز {b.Code} أصبح {b.CheckIn} → {b.CheckOut}", "booking", "/host/bookings");
            return Results.Ok(new { b.Total, changeFee });
        });

        g.MapPost("/bookings/{id:guid}/extend", async (Guid id, ExtendReq req, ClaimsPrincipal p, AppDb db, PricingService pricing, Notifier notify) =>
        {
            var b = await db.Bookings.Include(x => x.Property).FirstOrDefaultAsync(x => x.Id == id && x.GuestId == p.UserId());
            if (b == null) return Results.NotFound();
            if (b.Status is not (BookingStatus.Confirmed or BookingStatus.CheckedIn) || req.Nights < 1) return Results.BadRequest(new { error = "cannot_extend" });
            var newOut = b.CheckOut.AddDays(req.Nights);
            if (!await pricing.IsAvailable(b.PropertyId, b.CheckOut, newOut)) return Results.Conflict(new { error = "not_available" });
            // Extension is paid with the original payment method; the deposit is not charged again.
            var q = await pricing.QuoteAsync(b.Property!, b.CheckOut, newOut);
            b.CheckOut = newOut; b.Subtotal += q.Subtotal; b.ServiceFee += q.ServiceFee; b.Vat += q.Vat;
            b.Total += q.Subtotal + q.ServiceFee + q.Vat;
            await db.SaveChangesAsync();
            await notify.Send(b.Property!.HostId, "تمديد حجز", $"تم تمديد الحجز {b.Code} حتى {b.CheckOut}", "booking", "/host/bookings");
            return Results.Ok(new { b.CheckOut, b.Total });
        });

        g.MapPost("/bookings/{id:guid}/review", async (Guid id, ReviewReq req, ClaimsPrincipal p, AppDb db) =>
        {
            var b = await db.Bookings.FirstOrDefaultAsync(x => x.Id == id && x.GuestId == p.UserId());
            if (b == null) return Results.NotFound();
            if (b.Status is not (BookingStatus.Completed or BookingStatus.CheckedIn)) return Results.BadRequest(new { error = "not_completed" });
            if (await db.Reviews.AnyAsync(r => r.BookingId == id)) return Results.Conflict(new { error = "already_reviewed" });
            int clamp(int v) => Math.Clamp(v, 1, 10);
            db.Reviews.Add(new Review
            {
                BookingId = id, PropertyId = b.PropertyId, GuestId = b.GuestId, Overall = clamp(req.Overall), Accuracy = clamp(req.Accuracy),
                Cleanliness = clamp(req.Cleanliness), Facilities = clamp(req.Facilities), HostScore = clamp(req.HostScore), Comment = req.Comment,
            });
            await db.SaveChangesAsync();
            var prop = (await db.Properties.FindAsync(b.PropertyId))!;
            prop.ReviewsCount = await db.Reviews.CountAsync(r => r.PropertyId == prop.Id);
            prop.Rating = Math.Round(await db.Reviews.Where(r => r.PropertyId == prop.Id).AverageAsync(r => r.Overall), 1);
            await db.SaveChangesAsync();
            return Results.Ok();
        });

        g.MapGet("/recommended", async (ClaimsPrincipal p, AppDb db) => await PublicEndpoints.Recommend(db, p.UserId(), 12));

        g.MapGet("/tickets", async (ClaimsPrincipal p, AppDb db) =>
            await db.Tickets.Where(t => t.UserId == p.UserId()).OrderByDescending(t => t.CreatedAt).ToListAsync());

        g.MapPost("/tickets", async (TicketReq req, ClaimsPrincipal p, AppDb db) =>
        {
            var t = new SupportTicket { UserId = p.UserId(), Subject = req.Subject, Message = req.Message };
            db.Tickets.Add(t);
            await db.SaveChangesAsync();
            return t;
        });

        // Simple 1:1 messaging between guests and hosts.
        g.MapGet("/messages", async (ClaimsPrincipal p, AppDb db) =>
        {
            var uid = p.UserId();
            var msgs = await db.Messages.Where(m => m.SenderId == uid || m.ReceiverId == uid)
                .Include(m => m.Sender).Include(m => m.Receiver).OrderByDescending(m => m.CreatedAt).Take(500).ToListAsync();
            return msgs.GroupBy(m => m.SenderId == uid ? m.ReceiverId : m.SenderId).Select(g =>
            {
                var other = g.First().SenderId == uid ? g.First().Receiver! : g.First().Sender!;
                return new
                {
                    user = new { other.Id, other.FullName, other.AvatarUrl },
                    last = g.First().Body, at = g.First().CreatedAt,
                    unread = g.Count(m => m.ReceiverId == uid && !m.IsRead),
                    messages = g.OrderBy(m => m.CreatedAt).Select(m => new { m.Id, m.Body, m.CreatedAt, mine = m.SenderId == uid }),
                };
            });
        });

        g.MapPost("/messages", async (MessageReq req, ClaimsPrincipal p, AppDb db, Microsoft.AspNetCore.SignalR.IHubContext<Hubs.NotificationHub> hub) =>
        {
            var m = new Message { SenderId = p.UserId(), ReceiverId = req.To, PropertyId = req.PropertyId, Body = req.Body };
            db.Messages.Add(m);
            await db.SaveChangesAsync();
            await Microsoft.AspNetCore.SignalR.ClientProxyExtensions.SendAsync(hub.Clients.Group(req.To.ToString()), "message", new { m.Id, m.Body, from = m.SenderId, m.CreatedAt });
            return Results.Ok(new { m.Id });
        });

        g.MapPost("/messages/{userId:guid}/read", async (Guid userId, ClaimsPrincipal p, AppDb db) =>
        {
            var uid = p.UserId();
            await db.Messages.Where(m => m.SenderId == userId && m.ReceiverId == uid && !m.IsRead).ExecuteUpdateAsync(s => s.SetProperty(m => m.IsRead, true));
            return Results.Ok();
        });
    }
}
