using Microsoft.EntityFrameworkCore;

namespace flish.Infrastructure.Persistence;

public class Repository<T>(FlishDbContext dbContext) : IRepository<T> where T : class
{
    protected readonly FlishDbContext DbContext = dbContext;
    protected readonly DbSet<T> DbSet = dbContext.Set<T>();

    public async Task<T?> GetByIdAsync(Guid id, CancellationToken ct)
    {
        return await DbSet.FindAsync([id], ct);
    }

    public async Task<(List<T> Items, int Total)> GetPagedAsync(int page, int pageSize, CancellationToken ct)
    {
        var total = await DbSet.CountAsync(ct);
        var items = await DbSet
            .AsNoTracking()
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);
        return (items, total);
    }

    public void Add(T entity) => DbSet.Add(entity);

    public void Remove(T entity) => DbSet.Remove(entity);

    public async Task SaveChangesAsync(CancellationToken ct) => await DbContext.SaveChangesAsync(ct);
}
