using NetTopologySuite.Geometries;

namespace MyProject.API.Data;

public enum UserRole { Guest, Host, Provider, Admin }
public enum Direction { North, South, East, West, NorthEast, NorthWest, SouthEast, SouthWest }
public enum PropertyStatus { Pending, Approved, Rejected, Hidden }
public enum BookingStatus { PendingPayment, Confirmed, CheckedIn, Completed, Cancelled }
public enum PaymentMethod { Card, BankTransfer, Tamara, Tabby, ApplePay }
public enum ServiceBookingStatus { Pending, Accepted, Rejected, Arrived, Done, Confirmed, Cancelled }
public enum TicketStatus { Open, Answered, Closed }

/// <summary>Admin-managed option lists used by search filters and the add-property wizard.</summary>
public enum LookupKind { Category, Classification, Amenity, Kitchen, PoolType, BathType, Policy, Capacity, ServiceCategory }

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string FullName { get; set; } = "";
    public string Phone { get; set; } = "";
    public string? Email { get; set; }
    public UserRole Role { get; set; } = UserRole.Guest;
    public string? AvatarUrl { get; set; }
    public string? Address { get; set; }
    public DateOnly? BirthDate { get; set; }
    public string? Bio { get; set; }
    public bool IsActive { get; set; } = true;
    public bool ProfileCompleted { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class OtpCode
{
    public int Id { get; set; }
    public string Phone { get; set; } = "";
    public string Code { get; set; } = "";
    public DateTime ExpiresAt { get; set; }
    public int Attempts { get; set; }
}

public class City
{
    public int Id { get; set; }
    public string NameAr { get; set; } = "";
    public string NameEn { get; set; } = "";
    public string? ImageUrl { get; set; }
    public List<District> Districts { get; set; } = [];
}

public class District
{
    public int Id { get; set; }
    public int CityId { get; set; }
    public string NameAr { get; set; } = "";
    public string NameEn { get; set; } = "";
}

public class PropertyType
{
    public int Id { get; set; }
    public string NameAr { get; set; } = "";
    public string NameEn { get; set; } = "";
    public string Icon { get; set; } = "home";
}

public class Lookup
{
    public int Id { get; set; }
    public LookupKind Kind { get; set; }
    public string NameAr { get; set; } = "";
    public string NameEn { get; set; } = "";
    public string? Icon { get; set; }
    // Capacity buckets use Min/Max, other kinds ignore them.
    public int? Min { get; set; }
    public int? Max { get; set; }
}

public class Property
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Code { get; set; } = "";
    public Guid HostId { get; set; }
    public User? Host { get; set; }
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public int CityId { get; set; }
    public City? City { get; set; }
    public int DistrictId { get; set; }
    public District? District { get; set; }
    public string Address { get; set; } = "";
    public Point Location { get; set; } = new(46.67, 24.71) { SRID = 4326 };
    public double Lat { get; set; }
    public double Lng { get; set; }
    public int TypeId { get; set; }
    public PropertyType? Type { get; set; }
    public Direction Direction { get; set; }
    public int Area { get; set; }
    public int Rooms { get; set; }
    public int MasterRooms { get; set; }
    public int SingleBeds { get; set; }
    public int DoubleBeds { get; set; }
    public int Bathrooms { get; set; }
    public int Pools { get; set; }
    public int Capacity { get; set; }
    public decimal PricePerNight { get; set; }
    public int DiscountPercent { get; set; }
    public decimal? Deposit { get; set; }
    public bool FreeCancellation { get; set; }
    public string CancellationPolicy { get; set; } = "";
    public string CheckInTime { get; set; } = "16:00";
    public string CheckOutTime { get; set; } = "12:00";
    public string? VideoUrl { get; set; }
    public PropertyStatus Status { get; set; } = PropertyStatus.Pending;
    public bool IsFeatured { get; set; }
    public bool LocationGuaranteed { get; set; }
    public double Rating { get; set; }
    public int ReviewsCount { get; set; }
    public int Views { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public List<PropertyImage> Images { get; set; } = [];
    public List<Lookup> Lookups { get; set; } = [];

    public decimal EffectivePrice => Math.Round(PricePerNight * (100 - DiscountPercent) / 100m, 2);
}

public class PropertyImage
{
    public int Id { get; set; }
    public Guid PropertyId { get; set; }
    public string Url { get; set; } = "";
    public int Order { get; set; }
}

public class Booking
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Code { get; set; } = "";
    public Guid PropertyId { get; set; }
    public Property? Property { get; set; }
    public Guid GuestId { get; set; }
    public User? Guest { get; set; }
    public DateOnly CheckIn { get; set; }
    public DateOnly CheckOut { get; set; }
    public int Guests { get; set; } = 1;
    public decimal NightPrice { get; set; }
    public decimal Subtotal { get; set; }
    public decimal ServiceFee { get; set; }
    public decimal Vat { get; set; }
    public decimal Deposit { get; set; }
    public decimal ExtraFees { get; set; }
    public decimal Total { get; set; }
    public decimal Refund { get; set; }
    public PaymentMethod PaymentMethod { get; set; }
    public BookingStatus Status { get; set; } = BookingStatus.Confirmed;
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public int Nights => CheckOut.DayNumber - CheckIn.DayNumber;
}

public class Review
{
    public int Id { get; set; }
    public Guid BookingId { get; set; }
    public Guid PropertyId { get; set; }
    public Guid GuestId { get; set; }
    public User? Guest { get; set; }
    public int Overall { get; set; }
    public int Accuracy { get; set; }
    public int Cleanliness { get; set; }
    public int Facilities { get; set; }
    public int HostScore { get; set; }
    public string Comment { get; set; } = "";
    public string? HostReply { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Favorite
{
    public Guid UserId { get; set; }
    public Guid PropertyId { get; set; }
    public Property? Property { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class PropertyView
{
    public long Id { get; set; }
    public Guid UserId { get; set; }
    public Guid PropertyId { get; set; }
    public DateTime At { get; set; } = DateTime.UtcNow;
}

public class Notification
{
    public long Id { get; set; }
    public Guid UserId { get; set; }
    public string Title { get; set; } = "";
    public string Body { get; set; } = "";
    public string Type { get; set; } = "info";
    public string? Link { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>Hero slides and featured offers on the home page, managed from the admin panel.</summary>
public class Offer
{
    public int Id { get; set; }
    public string Kind { get; set; } = "offer"; // hero | offer
    public string Title { get; set; } = "";
    public string Subtitle { get; set; } = "";
    public string ImageUrl { get; set; } = "";
    public string? Badge { get; set; }
    public string? Link { get; set; }
    public bool IsActive { get; set; } = true;
    public int Order { get; set; }
}

public class Service
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProviderId { get; set; }
    public User? Provider { get; set; }
    public int CategoryId { get; set; }
    public Lookup? Category { get; set; }
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public decimal Price { get; set; }
    public int DurationMinutes { get; set; } = 60;
    public string? ImageUrl { get; set; }
    public bool IsActive { get; set; } = true;
    public double Rating { get; set; }
    public int ReviewsCount { get; set; }
}

public class ServiceBooking
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ServiceId { get; set; }
    public Service? Service { get; set; }
    public Guid HostId { get; set; }
    public User? Host { get; set; }
    public Guid PropertyId { get; set; }
    public Property? Property { get; set; }
    public DateTime ScheduledAt { get; set; }
    public decimal Price { get; set; }
    public string? Notes { get; set; }
    public string? ProviderNote { get; set; }
    public ServiceBookingStatus Status { get; set; } = ServiceBookingStatus.Pending;
    public int? Rating { get; set; }
    public string? Comment { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class SupportTicket
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public User? User { get; set; }
    public string Subject { get; set; } = "";
    public string Message { get; set; } = "";
    public string? Reply { get; set; }
    public TicketStatus Status { get; set; } = TicketStatus.Open;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Message
{
    public long Id { get; set; }
    public Guid SenderId { get; set; }
    public User? Sender { get; set; }
    public Guid ReceiverId { get; set; }
    public User? Receiver { get; set; }
    public Guid? PropertyId { get; set; }
    public string Body { get; set; } = "";
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>Key/value platform settings (fees, filter ranges, texts) editable by admins.</summary>
public class Setting
{
    public string Key { get; set; } = "";
    public string Value { get; set; } = "";
}
