using Microsoft.EntityFrameworkCore;

namespace MyProject.API.Data;

public class AppDb(DbContextOptions<AppDb> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<OtpCode> OtpCodes => Set<OtpCode>();
    public DbSet<City> Cities => Set<City>();
    public DbSet<District> Districts => Set<District>();
    public DbSet<PropertyType> PropertyTypes => Set<PropertyType>();
    public DbSet<Lookup> Lookups => Set<Lookup>();
    public DbSet<Property> Properties => Set<Property>();
    public DbSet<PropertyImage> PropertyImages => Set<PropertyImage>();
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<Favorite> Favorites => Set<Favorite>();
    public DbSet<PropertyView> PropertyViews => Set<PropertyView>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<Offer> Offers => Set<Offer>();
    public DbSet<Service> Services => Set<Service>();
    public DbSet<ServiceBooking> ServiceBookings => Set<ServiceBooking>();
    public DbSet<SupportTicket> Tickets => Set<SupportTicket>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<Setting> Settings => Set<Setting>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.HasPostgresExtension("postgis");

        b.Entity<User>().HasIndex(u => u.Phone).IsUnique();
        b.Entity<Property>(e =>
        {
            e.HasIndex(p => p.Code).IsUnique();
            e.HasIndex(p => p.Location).HasMethod("gist");
            e.Property(p => p.Location).HasColumnType("geography (point)");
            e.HasMany(p => p.Lookups).WithMany().UsingEntity("PropertyLookups");
            e.HasMany(p => p.Images).WithOne().HasForeignKey(i => i.PropertyId);
            e.Ignore(p => p.EffectivePrice);
        });
        b.Entity<Booking>(e =>
        {
            e.HasIndex(x => x.Code).IsUnique();
            e.HasIndex(x => new { x.PropertyId, x.CheckIn, x.CheckOut });
            e.Ignore(x => x.Nights);
        });
        b.Entity<Favorite>().HasKey(f => new { f.UserId, f.PropertyId });
        b.Entity<Setting>().HasKey(s => s.Key);
        b.Entity<Message>().HasOne(m => m.Sender).WithMany().HasForeignKey(m => m.SenderId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<Message>().HasOne(m => m.Receiver).WithMany().HasForeignKey(m => m.ReceiverId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<ServiceBooking>().HasOne(s => s.Host).WithMany().HasForeignKey(s => s.HostId).OnDelete(DeleteBehavior.Restrict);
    }
}
