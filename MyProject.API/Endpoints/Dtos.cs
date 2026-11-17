using System.Linq.Expressions;
using MyProject.API.Data;

namespace MyProject.API.Endpoints;

public record Name(string Ar, string En);

public record PropertyCard(
    Guid Id, string Code, string Title, Name City, Name District, Name Type, int TypeId,
    decimal Price, decimal OldPrice, int Discount, double Rating, int Reviews,
    List<string> Images, int Capacity, int Rooms, int Bathrooms, int Area, double Lat, double Lng,
    bool FreeCancellation, bool NoDeposit, bool IsFeatured, List<Name> Tags, PropertyStatus Status);

public record UserDto(Guid Id, string FullName, string Phone, string? Email, UserRole Role, string? AvatarUrl,
    string? Address, DateOnly? BirthDate, string? Bio, bool ProfileCompleted, bool IsActive, DateTime CreatedAt);

public static class Map
{
    public static UserDto ToDto(this User u) =>
        new(u.Id, u.FullName, u.Phone, u.Email, u.Role, u.AvatarUrl, u.Address, u.BirthDate, u.Bio, u.ProfileCompleted, u.IsActive, u.CreatedAt);

    /// <summary>EF-translatable projection used by every property listing.</summary>
    public static readonly Expression<Func<Property, PropertyCard>> Card = p => new PropertyCard(
        p.Id, p.Code, p.Title,
        new Name(p.City!.NameAr, p.City.NameEn),
        new Name(p.District!.NameAr, p.District.NameEn),
        new Name(p.Type!.NameAr, p.Type.NameEn), p.TypeId,
        p.PricePerNight * (100 - p.DiscountPercent) / 100, p.PricePerNight, p.DiscountPercent,
        p.Rating, p.ReviewsCount,
        p.Images.OrderBy(i => i.Order).Take(5).Select(i => i.Url).ToList(),
        p.Capacity, p.Rooms, p.Bathrooms, p.Area, p.Lat, p.Lng,
        p.FreeCancellation, p.Deposit == null || p.Deposit == 0, p.IsFeatured,
        p.Lookups.Where(l => l.Kind == LookupKind.Amenity).Take(3).Select(l => new Name(l.NameAr, l.NameEn)).ToList(),
        p.Status);
}
