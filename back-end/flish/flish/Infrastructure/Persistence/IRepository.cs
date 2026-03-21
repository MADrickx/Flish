namespace flish.Infrastructure.Persistence;

public interface IRepository<T> where T : class
{
    Task<T?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<(List<T> Items, int Total)> GetPagedAsync(int page, int pageSize, CancellationToken ct);
    void Add(T entity);
    void Remove(T entity);
    Task SaveChangesAsync(CancellationToken ct);
}
