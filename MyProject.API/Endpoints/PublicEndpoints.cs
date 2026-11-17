using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using MyProject.API.Data;
using MyProject.API.Services;
using NetTopologySuite.Geometries;

namespace MyProject.API.Endpoints;

public class SearchQuery
{
    public string? Q { get; set; }
    public int? CityId { get; set; }
    public string? DistrictIds { get; set; }
    public string? TypeIds { get; set; }
    public string? LookupIds { get; set; }
    public string? Directions { get; set; }
    public decimal? MinPrice { get; set; }
    public decimal? MaxPrice { get; set; }
    public int? MinArea { get; set; }
    public int? MaxArea { get; set; }
    public bool? Offers { get; set; }
    public bool? FreeCancel { get; set; }
    public bool? NoDeposit { get; set; }
    public double? MinRating { get; set; }
    public int? Rooms { get; set; }
    public int? MasterRooms { get; set; }
    public int? Beds { get; set; }
    public int? Bathrooms { get; set; }
    public int? Guests { get; set; }
    public int? CapacityId { get; set; }
    public DateOnly? CheckIn { get; set; }
    public DateOnly? CheckOut { get; set; }
    public double? Lat { get; set; }
    public double? Lng { get; set; }
    public double? RadiusKm { get; set; }
    public string? Bbox { get; set; } // minLng,minLat,maxLng,maxLat
    public string? Sort { get; set; }
    public int? Page { get; set; }
    public int? PageSize { get; set; }
}

public static class PublicEndpoints
{
    static List<int> Ints(string? csv) =>
        (csv ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries).Select(s => int.TryParse(s, out var v) ? v : -1).Where(v => v >= 0).ToList();

    static Guid? OptionalUser(ClaimsPrincipal p) => p.Identity?.IsAuthenticated == true ? p.UserId() : null;

    public static void MapPublic(this WebApplication app)
    {
        var api = app.MapGroup("/api");

        api.MapGet("/meta", async (AppDb db, PricingService pricing) => new
        {
            cities = await db.Cities.Include(c => c.Districts).OrderBy(c => c.Id).ToListAsync(),
            types = await db.PropertyTypes.OrderBy(t => t.Id).ToListAsync(),
            lookups = (await db.Lookups.OrderBy(l => l.Id).ToListAsync()).GroupBy(l => l.Kind.ToString()).ToDictionary(g => g.Key, g => g.ToList()),
            priceRange = new { min = await pricing.Setting("minPrice", 100), max = await pricing.Setting("maxPrice", 5000) },
            areaRange = new { min = await pricing.Setting("minArea", 30), max = await pricing.Setting("maxArea", 5000) },
            serviceFeePercent = await pricing.Setting("serviceFeePercent", 5),
            vatPercent = await pricing.Setting("vatPercent", 15),
        });

        api.MapGet("/home", async (AppDb db, ClaimsPrincipal p) =>
        {
            var approved = db.Properties.Where(x => x.Status == PropertyStatus.Approved);
            var uid = OptionalUser(p);
            return new
            {
                hero = await db.Offers.Where(o => o.IsActive && o.Kind == "hero").OrderBy(o => o.Order).ToListAsync(),
                offers = await db.Offers.Where(o => o.IsActive && o.Kind == "offer").OrderBy(o => o.Order).ToListAsync(),
                cities = await db.Cities.Select(c => new { c.Id, c.NameAr, c.NameEn, c.ImageUrl, count = approved.Count(x => x.CityId == c.Id) }).ToListAsync(),
                types = await db.PropertyTypes.Select(t => new { t.Id, t.NameAr, t.NameEn, t.Icon, count = approved.Count(x => x.TypeId == t.Id) }).ToListAsync(),
                featured = await approved.Where(x => x.IsFeatured || x.DiscountPercent > 0).OrderByDescending(x => x.DiscountPercent).Take(8).Select(Map.Card).ToListAsync(),
                recommended = await Recommend(db, uid, 8),
                topRated = await approved.OrderByDescending(x => x.Rating).ThenByDescending(x => x.ReviewsCount).Take(8).Select(Map.Card).ToListAsync(),
                stats = await Stats(db),
            };
        });

        api.MapGet("/stats", (AppDb db) => Stats(db));

        api.MapGet("/properties", async ([AsParameters] SearchQuery q, AppDb db, ClaimsPrincipal p) =>
        {
            var query = db.Properties.Where(x => x.Status == PropertyStatus.Approved);

            if (!string.IsNullOrWhiteSpace(q.Q))
            {
                var term = q.Q.Trim();
                query = query.Where(x => EF.Functions.ILike(x.Title, $"%{term}%") || x.Code == term.ToUpper()
                    || EF.Functions.ILike(x.City!.NameAr, $"%{term}%") || EF.Functions.ILike(x.City!.NameEn, $"%{term}%")
                    || EF.Functions.ILike(x.District!.NameAr, $"%{term}%") || EF.Functions.ILike(x.District!.NameEn, $"%{term}%"));
            }
            if (q.CityId is { } city) query = query.Where(x => x.CityId == city);
            if (Ints(q.DistrictIds) is { Count: > 0 } ds) query = query.Where(x => ds.Contains(x.DistrictId));
            if (Ints(q.TypeIds) is { Count: > 0 } ts) query = query.Where(x => ts.Contains(x.TypeId));
            foreach (var id in Ints(q.LookupIds)) query = query.Where(x => x.Lookups.Any(l => l.Id == id));
            if (Ints(q.Directions) is { Count: > 0 } dirs) query = query.Where(x => dirs.Contains((int)x.Direction));
            if (q.MinPrice is { } minP) query = query.Where(x => x.PricePerNight * (100 - x.DiscountPercent) / 100 >= minP);
            if (q.MaxPrice is { } maxP) query = query.Where(x => x.PricePerNight * (100 - x.DiscountPercent) / 100 <= maxP);
            if (q.MinArea is { } minA) query = query.Where(x => x.Area >= minA);
            if (q.MaxArea is { } maxA) query = query.Where(x => x.Area <= maxA);
            if (q.Offers == true) query = query.Where(x => x.DiscountPercent > 0);
            if (q.FreeCancel == true) query = query.Where(x => x.FreeCancellation);
            if (q.NoDeposit == true) query = query.Where(x => x.Deposit == null || x.Deposit == 0);
            if (q.MinRating is { } r) query = query.Where(x => x.Rating >= r);
            if (q.Rooms is { } rooms) query = query.Where(x => x.Rooms >= rooms);
            if (q.MasterRooms is { } mr) query = query.Where(x => x.MasterRooms >= mr);
            if (q.Beds is { } beds) query = query.Where(x => x.SingleBeds + x.DoubleBeds >= beds);
            if (q.Bathrooms is { } baths) query = query.Where(x => x.Bathrooms >= baths);
            if (q.Guests is { } guests) query = query.Where(x => x.Capacity >= guests);
            if (q.CapacityId is { } capId && await db.Lookups.FindAsync(capId) is { } cap)
                query = query.Where(x => x.Capacity >= (cap.Min ?? 0) && x.Capacity <= (cap.Max ?? 1000));
            if (q.CheckIn is { } ci && q.CheckOut is { } co && co > ci)
                query = query.Where(x => !db.Bookings.Any(b => b.PropertyId == x.Id && b.Status != BookingStatus.Cancelled && b.CheckIn < co && b.CheckOut > ci));
            if (q.Lat is { } lat && q.Lng is { } lng)
            {
                var center = new Point(lng, lat) { SRID = 4326 };
                query = query.Where(x => x.Location.IsWithinDistance(center, (q.RadiusKm ?? 50) * 1000));
            }
            if (q.Bbox?.Split(',').Select(double.Parse).ToArray() is [var x1, var y1, var x2, var y2])
                query = query.Where(x => x.Lng >= x1 && x.Lng <= x2 && x.Lat >= y1 && x.Lat <= y2);

            query = q.Sort switch
            {
                "priceAsc" => query.OrderBy(x => x.PricePerNight * (100 - x.DiscountPercent)),
                "priceDesc" => query.OrderByDescending(x => x.PricePerNight * (100 - x.DiscountPercent)),
                "rating" => query.OrderByDescending(x => x.Rating).ThenByDescending(x => x.ReviewsCount),
                "newest" => query.OrderByDescending(x => x.CreatedAt),
                _ => query.OrderByDescending(x => x.IsFeatured).ThenByDescending(x => x.Rating * 10 + x.Views / 100.0),
            };

            var total = await query.CountAsync();
            var pageSize = Math.Clamp(q.PageSize ?? 24, 1, 200);
            var page = Math.Max(q.Page ?? 1, 1);
            var items = await query.Skip((page - 1) * pageSize).Take(pageSize).Select(Map.Card).ToListAsync();
            return new { total, page, pageSize, items };
        });

        api.MapGet("/properties/{id:guid}", async (Guid id, AppDb db, ClaimsPrincipal p) =>
        {
            var x = await db.Properties
                .Include(x => x.City).Include(x => x.District).Include(x => x.Type).Include(x => x.Host)
                .Include(x => x.Images).Include(x => x.Lookups)
                .AsSplitQuery().FirstOrDefaultAsync(x => x.Id == id);
            if (x == null) return Results.NotFound();

            var uid = OptionalUser(p);
            if (x.Status != PropertyStatus.Approved && uid != x.HostId && !p.IsInRole("Admin")) return Results.NotFound();

            x.Views++;
            if (uid is { } u) db.PropertyViews.Add(new PropertyView { UserId = u, PropertyId = id });
            await db.SaveChangesAsync();

            // Exact pin is revealed only after a confirmed booking (spec 4: location shown precisely after confirmation).
            var hasBooking = uid != null && await db.Bookings.AnyAsync(b => b.PropertyId == id && b.GuestId == uid && b.Status != BookingStatus.Cancelled);
            var exact = hasBooking || uid == x.HostId;
            var today = DateOnly.FromDateTime(DateTime.UtcNow);

            return Results.Ok(new
            {
                x.Id, x.Code, x.Title, x.Description, x.Address, x.Area, x.Rooms, x.MasterRooms, x.SingleBeds, x.DoubleBeds,
                x.Bathrooms, x.Pools, x.Capacity, x.PricePerNight, price = x.EffectivePrice, x.DiscountPercent, x.Deposit,
                x.FreeCancellation, x.CancellationPolicy, x.CheckInTime, x.CheckOutTime, x.VideoUrl, x.LocationGuaranteed,
                x.Rating, x.ReviewsCount, x.Status, x.Direction, x.IsFeatured,
                city = new Name(x.City!.NameAr, x.City.NameEn), district = new Name(x.District!.NameAr, x.District.NameEn),
                type = new Name(x.Type!.NameAr, x.Type.NameEn), x.CityId, x.DistrictId, x.TypeId,
                lat = exact ? x.Lat : Math.Round(x.Lat, 2), lng = exact ? x.Lng : Math.Round(x.Lng, 2), exact,
                images = x.Images.OrderBy(i => i.Order).Select(i => i.Url),
                lookups = x.Lookups.Select(l => new { l.Id, kind = l.Kind.ToString(), l.NameAr, l.NameEn, l.Icon }),
                host = new
                {
                    x.Host!.Id, x.Host.FullName, x.Host.AvatarUrl, x.Host.Bio, since = x.Host.CreatedAt,
                    properties = await db.Properties.CountAsync(o => o.HostId == x.HostId && o.Status == PropertyStatus.Approved),
                    rating = await db.Properties.Where(o => o.HostId == x.HostId && o.ReviewsCount > 0).AverageAsync(o => (double?)o.Rating) ?? 0,
                },
                booked = await db.Bookings.Where(b => b.PropertyId == id && b.Status != BookingStatus.Cancelled && b.CheckOut >= today)
                    .Select(b => new { from = b.CheckIn, to = b.CheckOut }).ToListAsync(),
                isFavorite = uid != null && await db.Favorites.AnyAsync(f => f.UserId == uid && f.PropertyId == id),
                similar = await db.Properties.Where(o => o.Status == PropertyStatus.Approved && o.Id != id && (o.TypeId == x.TypeId || o.CityId == x.CityId))
                    .OrderByDescending(o => o.TypeId == x.TypeId && o.CityId == x.CityId).ThenByDescending(o => o.Rating).Take(6).Select(Map.Card).ToListAsync(),
            });
        });

        api.MapGet("/properties/{id:guid}/reviews", async (Guid id, AppDb db) =>
        {
            var reviews = db.Reviews.Where(r => r.PropertyId == id);
            return new
            {
                summary = new
                {
                    overall = await reviews.AverageAsync(r => (double?)r.Overall) ?? 0,
                    accuracy = await reviews.AverageAsync(r => (double?)r.Accuracy) ?? 0,
                    cleanliness = await reviews.AverageAsync(r => (double?)r.Cleanliness) ?? 0,
                    facilities = await reviews.AverageAsync(r => (double?)r.Facilities) ?? 0,
                    host = await reviews.AverageAsync(r => (double?)r.HostScore) ?? 0,
                    count = await reviews.CountAsync(),
                },
                items = await reviews.OrderByDescending(r => r.CreatedAt).Take(50).Select(r => new
                {
                    r.Id, r.Overall, r.Comment, r.HostReply, r.CreatedAt, guest = r.Guest!.FullName, avatar = r.Guest.AvatarUrl,
                }).ToListAsync(),
            };
        });

        api.MapGet("/properties/{id:guid}/quote", async (Guid id, DateOnly checkIn, DateOnly checkOut, AppDb db, PricingService pricing) =>
        {
            var x = await db.Properties.FindAsync(id);
            if (x == null) return Results.NotFound();
            return Results.Ok(new { quote = await pricing.QuoteAsync(x, checkIn, checkOut), available = await pricing.IsAvailable(id, checkIn, checkOut) });
        });

        // Expected-income calculator on the "add your property" page: avg nightly price × typical occupancy × 30.
        api.MapGet("/estimate", async (int typeId, int cityId, AppDb db, PricingService pricing) =>
        {
            var occupancy = await pricing.Setting("estimateOccupancy", 0.55m);
            var avg = await db.Properties.Where(x => x.TypeId == typeId && x.CityId == cityId && x.Status == PropertyStatus.Approved).AverageAsync(x => (decimal?)x.PricePerNight)
                ?? await db.Properties.Where(x => x.TypeId == typeId).AverageAsync(x => (decimal?)x.PricePerNight) ?? 600;
            var monthly = Math.Round(avg * 30 * occupancy / 10) * 10;
            return new { avgNight = Math.Round(avg), monthly, low = Math.Round(monthly * 0.75m / 10) * 10, high = Math.Round(monthly * 1.3m / 10) * 10, occupancy };
        });

        api.MapGet("/services", async (int? categoryId, string? q, AppDb db) =>
        {
            var s = db.Services.Where(x => x.IsActive && x.Provider!.IsActive);
            if (categoryId is { } c) s = s.Where(x => x.CategoryId == c);
            if (!string.IsNullOrWhiteSpace(q)) s = s.Where(x => EF.Functions.ILike(x.Title, $"%{q}%"));
            return await s.OrderByDescending(x => x.Rating).Select(x => new
            {
                x.Id, x.Title, x.Description, x.Price, x.DurationMinutes, x.ImageUrl, x.Rating, x.ReviewsCount, x.CategoryId,
                category = new Name(x.Category!.NameAr, x.Category.NameEn),
                provider = new { x.Provider!.Id, x.Provider.FullName, x.Provider.AvatarUrl },
            }).ToListAsync();
        });

        api.MapGet("/providers", async (AppDb db) =>
            await db.Users.Where(u => u.Role == UserRole.Provider && u.IsActive).Select(u => new
            {
                u.Id, u.FullName, u.AvatarUrl, u.Bio,
                rating = db.Services.Where(s => s.ProviderId == u.Id).Average(s => (double?)s.Rating) ?? 0,
                reviews = db.Services.Where(s => s.ProviderId == u.Id).Sum(s => s.ReviewsCount),
                services = db.Services.Count(s => s.ProviderId == u.Id && s.IsActive),
            }).OrderByDescending(u => u.rating).ToListAsync());

        api.MapGet("/providers/{id:guid}", async (Guid id, AppDb db) =>
        {
            var u = await db.Users.FirstOrDefaultAsync(x => x.Id == id && x.Role == UserRole.Provider);
            if (u == null) return Results.NotFound();
            return Results.Ok(new
            {
                u.Id, u.FullName, u.AvatarUrl, u.Bio,
                services = await db.Services.Where(s => s.ProviderId == id && s.IsActive).Select(s => new { s.Id, s.Title, s.Description, s.Price, s.DurationMinutes, s.ImageUrl, s.Rating }).ToListAsync(),
                reviews = await db.ServiceBookings.Where(b => b.Service!.ProviderId == id && b.Rating != null)
                    .OrderByDescending(b => b.CreatedAt).Take(20).Select(b => new { b.Rating, b.Comment, host = b.Host!.FullName, b.CreatedAt }).ToListAsync(),
            });
        });

        api.MapGet("/settings/public", async (AppDb db) =>
            await db.Settings.Where(s => s.Key.StartsWith("site.")).ToDictionaryAsync(s => s.Key, s => s.Value));
    }

    static async Task<object> Stats(AppDb db) => new
    {
        properties = await db.Properties.CountAsync(x => x.Status == PropertyStatus.Approved),
        cities = await db.Cities.CountAsync(),
        bookings = await db.Bookings.CountAsync(b => b.Status != BookingStatus.Cancelled),
        guests = await db.Users.CountAsync(u => u.Role == UserRole.Guest),
        activeBookings = await db.Bookings.CountAsync(b => b.Status == BookingStatus.Confirmed || b.Status == BookingStatus.CheckedIn),
    };

    /// <summary>
    /// Recommendation algorithm (spec admin §13): scores approved properties by how often the user viewed,
    /// favorited or booked the same type and city, then by rating. Anonymous users get top-rated + featured.
    /// </summary>
    public static async Task<List<PropertyCard>> Recommend(AppDb db, Guid? userId, int take)
    {
        var approved = db.Properties.Where(x => x.Status == PropertyStatus.Approved);
        if (userId is not { } uid) return await approved.OrderByDescending(x => x.IsFeatured).ThenByDescending(x => x.Rating).Take(take).Select(Map.Card).ToListAsync();

        var touched = await db.PropertyViews.Where(v => v.UserId == uid).Select(v => v.PropertyId)
            .Concat(db.Favorites.Where(f => f.UserId == uid).Select(f => f.PropertyId))
            .Concat(db.Bookings.Where(b => b.GuestId == uid).Select(b => b.PropertyId))
            .ToListAsync();
        if (touched.Count == 0) return await Recommend(db, null, take);

        var profile = await db.Properties.Where(x => touched.Contains(x.Id)).Select(x => new { x.TypeId, x.CityId, x.PricePerNight }).ToListAsync();
        var typeIds = profile.GroupBy(x => x.TypeId).OrderByDescending(g => g.Count()).Select(g => g.Key).Take(3).ToList();
        var cityIds = profile.GroupBy(x => x.CityId).OrderByDescending(g => g.Count()).Select(g => g.Key).Take(3).ToList();
        var avgPrice = profile.Average(x => x.PricePerNight);

        return await approved
            .OrderByDescending(x => (typeIds.Contains(x.TypeId) ? 3 : 0) + (cityIds.Contains(x.CityId) ? 2 : 0)
                + (x.PricePerNight >= avgPrice * 0.6m && x.PricePerNight <= avgPrice * 1.5m ? 1 : 0) + x.Rating / 10)
            .Take(take).Select(Map.Card).ToListAsync();
    }
}
