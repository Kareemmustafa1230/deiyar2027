using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;

namespace MyProject.API.Data;

/// <summary>Development seed: catalog lists from the spec, demo accounts for every app and ~60 listings with history.</summary>
public static class Seed
{
    const string U = "https://images.unsplash.com/photo-";
    const string Q = "?auto=format&fit=crop&w=1400&q=80";

    static readonly string[] Exterior =
    [
        "1613490493576-7fde63acd811", "1512917774080-9991f1c4c750", "1600596542815-ffad4c1539a9", "1600585154340-be6161a56a0c",
        "1582268611958-ebfd161ef9cf", "1564013799919-ab600027ffc6", "1566073771259-6a8506099945", "1571896349842-33c89424de2d",
        "1520250497591-112f2f40a3f4", "1499793983690-e29da59ef1c2", "1449844908441-8829872d2607", "1580587771525-78b9dba3b914",
        "1602343168117-bb8ffe3e2e9f", "1568605114967-8130f3a36994", "1570129477492-45c003edd2be", "1576941089067-2de3c901e126",
    ];
    static readonly string[] Interior =
    [
        "1502672260266-1c1ef2d93688", "1522708323590-d24dbb6b0267", "1560448204-e02f11c3d0e2", "1505693416388-ac5ce068fe85",
        "1586023492125-27b2c045efd7", "1600607687939-ce8a6c25118c", "1600566753190-17f0baa2a6c3", "1600210492486-724fe5c67fb0",
        "1493809842364-78817add7ffb", "1484154218962-a197022b5858", "1556909114-f6e7ad7d3136", "1616594039964-ae9021a400a0",
        "1631049307264-da0ec9d70304", "1618773928121-c32242e63f39", "1540518614846-7eded433c457", "1552321554-5fefe8c9ef14",
    ];

    static string Img(string id) => U + id + Q;

    public static async Task Run(AppDb db)
    {
        if (await db.Cities.AnyAsync()) return;
        var rnd = new Random(42);

        // ---------- Cities & districts ----------
        (string ar, string en, double lat, double lng, string img, string[] dAr, string[] dEn)[] cities =
        [
            ("الرياض", "Riyadh", 24.7136, 46.6753, "1586724237569-f3d0c1dee8c6", ["الملقا", "حطين", "النرجس", "العارض", "الياسمين", "الرمال"], ["Al Malqa", "Hittin", "An Narjis", "Al Arid", "Al Yasmin", "Ar Rimal"]),
            ("جدة", "Jeddah", 21.5433, 39.1728, "1578895101408-1a36b834405b", ["أبحر الشمالية", "الشاطئ", "الحمراء", "الروضة", "درة العروس"], ["North Obhur", "Ash Shati", "Al Hamra", "Ar Rawdah", "Durrat Al Arus"]),
            ("مكة المكرمة", "Makkah", 21.3891, 39.8579, "1591604129939-f1efa4d9f7fa", ["العزيزية", "الشوقية", "النسيم"], ["Al Aziziyah", "Ash Shawqiyah", "An Naseem"]),
            ("المدينة المنورة", "Madinah", 24.5247, 39.5692, "1565552645632-d725f8bfc19a", ["قباء", "العزيزية", "الدفاع"], ["Quba", "Al Aziziyah", "Ad Difa"]),
            ("الدمام", "Dammam", 26.4207, 50.0888, "1582407947304-fd86f028f716", ["الشاطئ", "الفيصلية", "النخيل"], ["Ash Shati", "Al Faisaliyah", "An Nakheel"]),
            ("الخبر", "Khobar", 26.2172, 50.1971, "1597212720158-e21dad559189", ["الكورنيش", "العقربية", "الحزام الذهبي"], ["Corniche", "Al Aqrabiyah", "Golden Belt"]),
            ("أبها", "Abha", 18.2164, 42.5053, "1605649487212-47bdab064df7", ["السودة", "المنسك", "الضباب"], ["Al Soudah", "Al Mansak", "Ad Dabab"]),
            ("الطائف", "Taif", 21.2703, 40.4158, "1572252009286-268acec5ca0a", ["الهدا", "الشفا", "الحوية"], ["Al Hada", "Ash Shafa", "Al Hawiyah"]),
            ("العلا", "AlUla", 26.6084, 37.9232, "1586183189334-1c2dd6b7c5ea", ["الواحة", "العذيب"], ["The Oasis", "Al Udhayb"]),
        ];
        var cityEntities = cities.Select(c => new City
        {
            NameAr = c.ar, NameEn = c.en, ImageUrl = Img(c.img),
            Districts = c.dAr.Select((d, i) => new District { NameAr = d, NameEn = c.dEn[i] }).ToList(),
        }).ToList();
        db.Cities.AddRange(cityEntities);

        // ---------- Property types ----------
        var types = new (string ar, string en, string icon)[]
        {
            ("شاليهات", "Chalets", "waves"), ("استراحات", "Rest houses", "tent-tree"), ("فلل", "Villas", "castle"),
            ("شقق", "Apartments", "building-2"), ("مزارع", "Farms", "trees"), ("منتجعات", "Resorts", "palmtree"),
            ("استوديو", "Studios", "sofa"), ("غرف فندقية", "Hotel rooms", "bed-double"), ("مخيمات", "Camps", "tent"),
        }.Select(t => new PropertyType { NameAr = t.ar, NameEn = t.en, Icon = t.icon }).ToList();
        db.PropertyTypes.AddRange(types);

        // ---------- Admin-managed lookup lists (from spec §3 filters & host wizard) ----------
        Lookup L(LookupKind k, string ar, string en, string? icon = null, int? min = null, int? max = null) =>
            new() { Kind = k, NameAr = ar, NameEn = en, Icon = icon, Min = min, Max = max };
        var lookups = new List<Lookup>
        {
            L(LookupKind.Category, "عوائل", "Families", "users"), L(LookupKind.Category, "أزواج", "Couples", "heart"),
            L(LookupKind.Category, "عزاب", "Singles", "user"), L(LookupKind.Category, "مناسبات", "Events", "party-popper"),
            L(LookupKind.Category, "مسافرين", "Travelers", "luggage"),
            L(LookupKind.Classification, "مميز", "Featured", "sparkles"), L(LookupKind.Classification, "تراثي", "Heritage", "landmark"),
            L(LookupKind.Classification, "ريفي", "Rural", "wheat"), L(LookupKind.Classification, "فخم", "Luxury", "gem"),
            L(LookupKind.Classification, "عصري", "Modern", "lamp"),
            L(LookupKind.Amenity, "واي فاي", "Wi-Fi", "wifi"), L(LookupKind.Amenity, "مسبح", "Pool", "waves"),
            L(LookupKind.Amenity, "بلياردو", "Billiards", "circle-dot"), L(LookupKind.Amenity, "خدمة غرف", "Room service", "concierge-bell"),
            L(LookupKind.Amenity, "خدمة توصيل", "Delivery", "truck"), L(LookupKind.Amenity, "مصعد", "Elevator", "arrow-up-down"),
            L(LookupKind.Amenity, "موقف سيارات", "Parking", "car"), L(LookupKind.Amenity, "شواء", "BBQ", "flame"),
            L(LookupKind.Amenity, "ملعب", "Playground", "trophy"), L(LookupKind.Amenity, "مجلس", "Majlis", "armchair"),
            L(LookupKind.Amenity, "تلفاز ذكي", "Smart TV", "tv"), L(LookupKind.Amenity, "تكييف", "A/C", "snowflake"),
            L(LookupKind.Amenity, "ألعاب أطفال", "Kids area", "baby"), L(LookupKind.Amenity, "حديقة", "Garden", "flower-2"),
            L(LookupKind.Kitchen, "ثلاجة", "Fridge", "refrigerator"), L(LookupKind.Kitchen, "فريزر", "Freezer", "snowflake"),
            L(LookupKind.Kitchen, "فرن", "Oven", "cooking-pot"), L(LookupKind.Kitchen, "مايكرويف", "Microwave", "microwave"),
            L(LookupKind.Kitchen, "أواني طبخ", "Cookware", "utensils"), L(LookupKind.Kitchen, "آلة قهوة", "Coffee maker", "coffee"),
            L(LookupKind.PoolType, "مسبح داخلي", "Indoor pool", "waves"), L(LookupKind.PoolType, "مسبح خارجي", "Outdoor pool", "sun"),
            L(LookupKind.PoolType, "مسبح بتدفئة", "Heated pool", "thermometer"), L(LookupKind.PoolType, "مسبح روف", "Rooftop pool", "building"),
            L(LookupKind.PoolType, "بحاجز للأطفال", "Child-safe pool", "shield"),
            L(LookupKind.BathType, "جاكوزي", "Jacuzzi", "bath"), L(LookupKind.BathType, "ساونا", "Sauna", "cloud-fog"),
            L(LookupKind.BathType, "بانيو", "Bathtub", "bath"), L(LookupKind.BathType, "دش مطري", "Rain shower", "shower-head"),
            L(LookupKind.Policy, "إلغاء مجاني", "Free cancellation", "badge-check"), L(LookupKind.Policy, "بدون تأمين", "No deposit", "wallet"),
            L(LookupKind.Policy, "دخول ذاتي", "Self check-in", "key-round"),
            L(LookupKind.Capacity, "1 - 5 أشخاص", "1–5 guests", null, 1, 5), L(LookupKind.Capacity, "5 - 10 أشخاص", "5–10 guests", null, 5, 10),
            L(LookupKind.Capacity, "10 - 20 شخص", "10–20 guests", null, 10, 20), L(LookupKind.Capacity, "أكثر من 20", "20+ guests", null, 20, 1000),
            L(LookupKind.ServiceCategory, "تنظيف", "Cleaning", "sparkles"), L(LookupKind.ServiceCategory, "صيانة", "Maintenance", "wrench"),
            L(LookupKind.ServiceCategory, "تنظيف مسابح", "Pool care", "waves"), L(LookupKind.ServiceCategory, "ترميم", "Renovation", "hammer"),
            L(LookupKind.ServiceCategory, "تصوير عقارات", "Photography", "camera"), L(LookupKind.ServiceCategory, "مكافحة حشرات", "Pest control", "bug"),
        };
        db.Lookups.AddRange(lookups);

        // ---------- Demo accounts (log in with these phones; OTP is shown in dev) ----------
        User Mk(string name, string phone, UserRole role, string avatar, string? bio = null) =>
            new() { FullName = name, Phone = phone, Role = role, AvatarUrl = $"https://i.pravatar.cc/240?img={avatar}", Bio = bio, ProfileCompleted = true, Email = $"{phone}@deiyar.test", CreatedAt = DateTime.UtcNow.AddDays(-rnd.Next(60, 900)) };
        var admin = Mk("مدير المنصة", "0500000000", UserRole.Admin, "68");
        var hosts = new[]
        {
            Mk("عبدالله الشمري", "0500000001", UserRole.Host, "12", "مضيف معتمد منذ 2021، أحرص على راحة ضيوفي وتجهيز كل التفاصيل."),
            Mk("نورة القحطاني", "0500000011", UserRole.Host, "47", "أدير مجموعة شاليهات عائلية في جدة والطائف."),
            Mk("فيصل العتيبي", "0500000012", UserRole.Host, "15", "مزارع واستراحات بطابع ريفي أصيل."),
            Mk("سارة الدوسري", "0500000013", UserRole.Host, "45", "شقق فندقية عصرية بمواقع مميزة."),
        };
        var guests = new[]
        {
            Mk("محمد الحربي", "0500000002", UserRole.Guest, "33"), Mk("ريم السبيعي", "0500000021", UserRole.Guest, "44"),
            Mk("خالد المطيري", "0500000022", UserRole.Guest, "53"), Mk("هيا الزهراني", "0500000023", UserRole.Guest, "49"),
            Mk("سلطان الغامدي", "0500000024", UserRole.Guest, "59"), Mk("لمى العنزي", "0500000025", UserRole.Guest, "32"),
        };
        var providers = new[]
        {
            Mk("شركة لمعة للتنظيف", "0500000003", UserRole.Provider, "60", "فريق تنظيف محترف للشاليهات والفلل بمعدات حديثة."),
            Mk("أبو ياسر للصيانة", "0500000031", UserRole.Provider, "57", "سباكة، كهرباء، تكييف — خبرة 12 سنة."),
            Mk("أزرق لخدمات المسابح", "0500000032", UserRole.Provider, "14", "تنظيف ومعالجة المسابح وفحص المضخات."),
        };
        db.Users.Add(admin);
        db.Users.AddRange(hosts); db.Users.AddRange(guests); db.Users.AddRange(providers);
        await db.SaveChangesAsync();

        // ---------- Properties ----------
        string[] adjectives = ["الفخامة", "النخبة", "الراحة", "الهدوء", "اللؤلؤة", "الواحة", "السكينة", "الريم", "الأفق", "المرجان", "الندى", "السحاب"];
        var titleByType = new Dictionary<string, string>
        {
            ["Chalets"] = "شاليه", ["Rest houses"] = "استراحة", ["Villas"] = "فيلا", ["Apartments"] = "شقة", ["Farms"] = "مزرعة",
            ["Resorts"] = "منتجع", ["Studios"] = "استوديو", ["Hotel rooms"] = "جناح", ["Camps"] = "مخيم",
        };
        var basePrice = new Dictionary<string, int>
        {
            ["Chalets"] = 900, ["Rest houses"] = 700, ["Villas"] = 1600, ["Apartments"] = 380, ["Farms"] = 1200,
            ["Resorts"] = 2200, ["Studios"] = 260, ["Hotel rooms"] = 450, ["Camps"] = 650,
        };
        string[] descriptions =
        [
            "وحدة مصممة بعناية لتمنحك تجربة إقامة لا تُنسى، بإطلالة ساحرة ومساحات واسعة تناسب العائلة والأصدقاء. تحتوي على مجلس خارجي، جلسات شواء، وتجهيزات متكاملة للمطبخ.",
            "استمتع بالخصوصية التامة في مكان هادئ بعيد عن صخب المدينة، مع مسبح خاص وإضاءة ليلية ساحرة ومساحات خضراء. مناسبة للمناسبات والتجمعات العائلية.",
            "تصميم عصري بلمسات فاخرة، أثاث جديد بالكامل، وموقع قريب من أهم المعالم والخدمات. دخول ذاتي ذكي وخدمة عملاء على مدار الساعة.",
            "تجربة ريفية أصيلة وسط الطبيعة، بيوت شعر وجلسات أرضية، ألعاب للأطفال ومساحات مفتوحة للاستمتاع بأجواء الطقس الجميل.",
        ];
        var amenities = lookups.Where(l => l.Kind == LookupKind.Amenity).ToList();
        var props = new List<Property>();
        int code = 10231;
        foreach (var (city, ci) in cityEntities.Select((c, i) => (c, i)))
        {
            var count = ci switch { 0 => 12, 1 => 10, 6 or 7 => 6, _ => 5 };
            for (int k = 0; k < count; k++)
            {
                var type = types[(k + ci) % types.Count];
                var district = city.Districts[rnd.Next(city.Districts.Count)];
                var big = type.NameEn is "Villas" or "Chalets" or "Farms" or "Resorts" or "Rest houses" or "Camps";
                var lat = cities[ci].lat + (rnd.NextDouble() - 0.5) * 0.18;
                var lng = cities[ci].lng + (rnd.NextDouble() - 0.5) * 0.18;
                var price = basePrice[type.NameEn] * (0.75 + rnd.NextDouble() * 0.8);
                var p = new Property
                {
                    Code = $"DY{code++}", HostId = hosts[(k + ci) % hosts.Length].Id,
                    Title = $"{titleByType[type.NameEn]} {adjectives[rnd.Next(adjectives.Length)]} - {district.NameAr}",
                    Description = descriptions[rnd.Next(descriptions.Length)],
                    CityId = city.Id, DistrictId = district.Id, Address = $"{city.NameAr}، حي {district.NameAr}، شارع {rnd.Next(1, 60)}",
                    Lat = lat, Lng = lng, Location = new Point(lng, lat) { SRID = 4326 },
                    TypeId = type.Id, Direction = (Direction)rnd.Next(8),
                    Area = big ? rnd.Next(300, 2500) : rnd.Next(45, 220),
                    Rooms = big ? rnd.Next(2, 7) : rnd.Next(1, 4), MasterRooms = rnd.Next(0, 3),
                    SingleBeds = rnd.Next(0, 6), DoubleBeds = rnd.Next(1, 4), Bathrooms = rnd.Next(1, 5),
                    Pools = big ? rnd.Next(0, 3) : 0, Capacity = big ? rnd.Next(6, 40) : rnd.Next(2, 6),
                    PricePerNight = Math.Round((decimal)price / 10) * 10,
                    DiscountPercent = rnd.Next(4) == 0 ? new[] { 10, 15, 20, 25 }[rnd.Next(4)] : 0,
                    Deposit = rnd.Next(3) == 0 ? null : rnd.Next(2, 10) * 100,
                    FreeCancellation = rnd.Next(2) == 0,
                    CancellationPolicy = "إلغاء مجاني حتى 48 ساعة قبل موعد الوصول، بعد ذلك يُسترد مبلغ التأمين فقط.",
                    CheckInTime = new[] { "15:00", "16:00", "14:00" }[rnd.Next(3)], CheckOutTime = new[] { "11:00", "12:00" }[rnd.Next(2)],
                    Status = PropertyStatus.Approved, IsFeatured = rnd.Next(5) == 0, LocationGuaranteed = rnd.Next(3) > 0,
                    Views = rnd.Next(50, 4000), CreatedAt = DateTime.UtcNow.AddDays(-rnd.Next(5, 400)),
                };
                var ext = Exterior.OrderBy(_ => rnd.Next()).Take(2);
                var inn = Interior.OrderBy(_ => rnd.Next()).Take(4);
                p.Images = ext.Concat(inn).Select((id, i) => new PropertyImage { Url = Img(id), Order = i }).ToList();
                p.Lookups = amenities.OrderBy(_ => rnd.Next()).Take(rnd.Next(5, 10))
                    .Concat(lookups.Where(l => l.Kind is LookupKind.Category or LookupKind.Classification or LookupKind.Kitchen or LookupKind.BathType).OrderBy(_ => rnd.Next()).Take(rnd.Next(4, 9)))
                    .Concat(p.Pools > 0 ? lookups.Where(l => l.Kind == LookupKind.PoolType).OrderBy(_ => rnd.Next()).Take(1) : [])
                    .Concat(p.FreeCancellation ? lookups.Where(l => l.NameEn == "Free cancellation") : [])
                    .Concat(p.Deposit == null ? lookups.Where(l => l.NameEn == "No deposit") : [])
                    .Distinct().ToList();
                props.Add(p);
            }
        }
        props[3].Status = PropertyStatus.Pending; props[17].Status = PropertyStatus.Pending;
        db.Properties.AddRange(props);
        await db.SaveChangesAsync();

        // ---------- Bookings & reviews (history drives ratings, reports and recommendations) ----------
        string[] comments =
        [
            "المكان رائع ونظيف جداً والمضيف متعاون، أنصح به بشدة 👌", "تجربة ممتازة، المسبح نظيف والجلسات جميلة",
            "الموقع ممتاز والخصوصية عالية، سنكرر الزيارة إن شاء الله", "كل شيء مطابق للصور، والاستقبال كان سريع",
            "مناسب للعائلات، الأطفال استمتعوا كثيراً بالألعاب", "إطلالة خيالية وهدوء تام، أفضل إقامة لنا هذا العام",
            "جيد بشكل عام لكن يحتاج تحسين بسيط في المطبخ", "نظافة ١٠/١٠ وتعامل راقي من المضيف",
        ];
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var bookings = new List<Booking>();
        var bookingSeq = 100001;
        var reviews = new List<Review>();
        foreach (var p in props.Where(p => p.Status == PropertyStatus.Approved))
        {
            var cursor = today.AddDays(-rnd.Next(300, 360));
            while (cursor < today.AddDays(45))
            {
                cursor = cursor.AddDays(rnd.Next(3, 25));
                var nights = rnd.Next(1, 5);
                var guest = guests[rnd.Next(guests.Length)];
                var sub = p.EffectivePrice * nights;
                var fee = Math.Round(sub * 0.05m, 2);
                var vat = Math.Round((sub + fee) * 0.15m, 2);
                var end = cursor.AddDays(nights);
                var status = end <= today ? BookingStatus.Completed : cursor <= today ? BookingStatus.CheckedIn : BookingStatus.Confirmed;
                if (rnd.Next(14) == 0) status = BookingStatus.Cancelled;
                var b = new Booking
                {
                    Code = $"BK{bookingSeq++}", PropertyId = p.Id, GuestId = guest.Id, CheckIn = cursor, CheckOut = end,
                    Guests = Math.Min(p.Capacity, rnd.Next(1, 8)), NightPrice = p.EffectivePrice, Subtotal = sub, ServiceFee = fee, Vat = vat,
                    Deposit = p.Deposit ?? 0, Total = sub + fee + vat + (p.Deposit ?? 0), PaymentMethod = (PaymentMethod)rnd.Next(5), Status = status,
                    CreatedAt = cursor.AddDays(-rnd.Next(1, 20)).ToDateTime(new TimeOnly(rnd.Next(8, 23), 0), DateTimeKind.Utc),
                };
                bookings.Add(b);
                cursor = end;
                if (status == BookingStatus.Completed && rnd.Next(3) > 0)
                {
                    var o = rnd.Next(7, 11);
                    reviews.Add(new Review
                    {
                        BookingId = b.Id, PropertyId = p.Id, GuestId = guest.Id, Overall = o, Accuracy = Math.Min(10, o + rnd.Next(-1, 2)),
                        Cleanliness = Math.Min(10, o + rnd.Next(-1, 2)), Facilities = Math.Min(10, o + rnd.Next(-2, 1)), HostScore = Math.Min(10, o + rnd.Next(0, 2)),
                        Comment = comments[rnd.Next(comments.Length)], CreatedAt = end.ToDateTime(new TimeOnly(12, 0), DateTimeKind.Utc),
                        HostReply = rnd.Next(3) == 0 ? "شكراً لك، سعدنا باستضافتك ونتطلع لزيارتك القادمة 🌷" : null,
                    });
                }
            }
        }
        db.Bookings.AddRange(bookings);
        db.Reviews.AddRange(reviews);
        foreach (var p in props)
        {
            var rs = reviews.Where(r => r.PropertyId == p.Id).ToList();
            p.ReviewsCount = rs.Count;
            p.Rating = rs.Count > 0 ? Math.Round(rs.Average(r => r.Overall), 1) : 0;
        }

        // ---------- Services ----------
        var cats = lookups.Where(l => l.Kind == LookupKind.ServiceCategory).ToList();
        var services = new List<Service>
        {
            new() { ProviderId = providers[0].Id, CategoryId = cats[0].Id, Title = "تنظيف شامل للشاليه", Description = "تنظيف عميق لكامل الوحدة يشمل الغرف والمطبخ ودورات المياه والجلسات الخارجية مع تعقيم.", Price = 450, DurationMinutes = 240, ImageUrl = Img("1581578731548-c64695cc6952") },
            new() { ProviderId = providers[0].Id, CategoryId = cats[0].Id, Title = "تنظيف ما بعد المغادرة", Description = "تجهيز سريع للوحدة بين حجزين: تغيير المفارش، تنظيف، وتعطير.", Price = 220, DurationMinutes = 120, ImageUrl = Img("1527515637462-cff94eecc1ac") },
            new() { ProviderId = providers[1].Id, CategoryId = cats[1].Id, Title = "صيانة تكييف", Description = "فحص وتنظيف وحدات التكييف وتعبئة الفريون عند الحاجة.", Price = 180, DurationMinutes = 90, ImageUrl = Img("1621905251918-48416bd8575a") },
            new() { ProviderId = providers[1].Id, CategoryId = cats[1].Id, Title = "سباكة وكهرباء", Description = "إصلاح التسريبات، تمديدات كهربائية، تبديل الإنارة والمفاتيح.", Price = 150, DurationMinutes = 60, ImageUrl = Img("1581244277943-fe4a9c777189") },
            new() { ProviderId = providers[2].Id, CategoryId = cats[2].Id, Title = "تنظيف ومعالجة مسبح", Description = "شفط، تنظيف الجدران، ضبط الكلور والـ pH، وفحص الفلاتر.", Price = 300, DurationMinutes = 120, ImageUrl = Img("1575429198097-0414ec08e8cd") },
            new() { ProviderId = providers[2].Id, CategoryId = cats[4].Id, Title = "تصوير احترافي للعقار", Description = "جلسة تصوير احترافية مع تعديل الصور لرفع جاذبية إعلانك.", Price = 600, DurationMinutes = 180, ImageUrl = Img("1452587925148-ce544e77e70d") },
        };
        db.Services.AddRange(services);
        await db.SaveChangesAsync();

        var hostProps = props.Where(p => p.HostId == hosts[0].Id).ToList();
        var sbStatuses = new[] { ServiceBookingStatus.Confirmed, ServiceBookingStatus.Confirmed, ServiceBookingStatus.Done, ServiceBookingStatus.Accepted, ServiceBookingStatus.Pending, ServiceBookingStatus.Pending };
        for (int i = 0; i < 18; i++)
        {
            var s = services[i % services.Count];
            var st = sbStatuses[i % sbStatuses.Length];
            var when = st is ServiceBookingStatus.Pending or ServiceBookingStatus.Accepted ? DateTime.UtcNow.AddDays(rnd.Next(1, 10)) : DateTime.UtcNow.AddDays(-rnd.Next(1, 120));
            db.ServiceBookings.Add(new ServiceBooking
            {
                ServiceId = s.Id, HostId = hosts[0].Id, PropertyId = hostProps[i % hostProps.Count].Id, ScheduledAt = new DateTime(when.Year, when.Month, when.Day, rnd.Next(9, 18), 0, 0, DateTimeKind.Utc),
                Price = s.Price, Status = st, Rating = st == ServiceBookingStatus.Confirmed ? rnd.Next(4, 6) : null,
                Comment = st == ServiceBookingStatus.Confirmed ? "خدمة ممتازة والتزام بالموعد" : null, Notes = "يرجى التواصل قبل الوصول بنصف ساعة",
            });
        }
        foreach (var s in services) { s.Rating = Math.Round(4.3 + rnd.NextDouble() * 0.7, 1); s.ReviewsCount = rnd.Next(8, 120); }

        // ---------- Home content ----------
        db.Offers.AddRange(
            new Offer { Kind = "hero", Title = "عطلتك القادمة تبدأ من هنا", Subtitle = "شاليهات، فلل، ومزارع مختارة بعناية في أجمل مدن المملكة", ImageUrl = Img("1613490493576-7fde63acd811"), Badge = "شاليه اللؤلؤة · جدة", Link = "/search?cityId=2", Order = 1 },
            new Offer { Kind = "hero", Title = "أجواء الجنوب بانتظارك", Subtitle = "استمتع بالضباب والطبيعة في أبها والسودة", ImageUrl = Img("1499793983690-e29da59ef1c2"), Badge = "السودة · أبها", Link = "/search?cityId=7", Order = 2 },
            new Offer { Kind = "hero", Title = "فخامة تستحقها", Subtitle = "فلل خاصة بمسابح وإطلالات لا تُنسى", ImageUrl = Img("1512917774080-9991f1c4c750"), Badge = "فيلا النخبة · الرياض", Link = "/search?typeIds=3", Order = 3 },
            new Offer { Kind = "offer", Title = "خصم حتى 25%", Subtitle = "على الشاليهات المختارة لفترة محدودة", ImageUrl = Img("1571896349842-33c89424de2d"), Badge = "عرض محدود", Link = "/search?offers=true", Order = 1 },
            new Offer { Kind = "offer", Title = "أقم أسبوعاً وادفع 6 ليالٍ", Subtitle = "عروض الإقامة الطويلة على الشقق المفروشة", ImageUrl = Img("1522708323590-d24dbb6b0267"), Badge = "إقامة طويلة", Link = "/search?typeIds=4", Order = 2 },
            new Offer { Kind = "offer", Title = "توصيل مجاني من المطار", Subtitle = "مع حجوزات المنتجعات في العلا وأبها", ImageUrl = Img("1520250497591-112f2f40a3f4"), Badge = "خدمة مجانية", Link = "/search?typeIds=6", Order = 3 });

        db.Settings.AddRange(
            new Setting { Key = "serviceFeePercent", Value = "5" }, new Setting { Key = "vatPercent", Value = "15" },
            new Setting { Key = "minPrice", Value = "100" }, new Setting { Key = "maxPrice", Value = "5000" },
            new Setting { Key = "minArea", Value = "30" }, new Setting { Key = "maxArea", Value = "5000" },
            new Setting { Key = "changeFee", Value = "50" }, new Setting { Key = "providerCommissionPercent", Value = "15" },
            new Setting { Key = "estimateOccupancy", Value = "0.55" },
            new Setting { Key = "site.phone", Value = "+966 55 660 0279" }, new Setting { Key = "site.email", Value = "Info@deiyar.com" },
            new Setting { Key = "site.estimateNote", Value = "تعمل هذه الأداة باستخدام خوارزميات تقدير تعتمد على بيانات السوق، مثل الطلب على أنواع معينة من العقارات في مواقع محددة، وأسعار الإيجار الحالية، والعوامل الموسمية. يتم إصدار النتائج بناءً على بيانات منصة دياري." });

        db.Tickets.Add(new SupportTicket { UserId = guests[0].Id, Subject = "استفسار عن استرداد مبلغ التأمين", Message = "متى يتم إرجاع مبلغ التأمين بعد المغادرة؟" });
        db.Notifications.Add(new Notification { UserId = guests[0].Id, Title = "مرحباً بك في دياري 👋", Body = "اكتشف أجمل الشاليهات والفلل في المملكة", Type = "promo" });
        await db.SaveChangesAsync();
    }
}
