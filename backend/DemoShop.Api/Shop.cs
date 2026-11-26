using System.Collections.Concurrent;
using Newtonsoft.Json;

namespace DemoShop.Api;

public sealed record Product(int Id, string Name, string Category, decimal Price, string Description);
public sealed record OrderLineRequest(int ProductId, int Quantity);
public sealed record CreateOrderRequest(List<OrderLineRequest?>? Items);
public sealed record OrderItem(int ProductId, string Name, int Quantity, decimal UnitPrice, decimal Total);
public sealed record Order(Guid Id, DateTimeOffset CreatedAt, IReadOnlyList<OrderItem> Items, decimal Total);

public sealed class Catalog
{
    public IReadOnlyList<Product> Products { get; }

    public Catalog(IWebHostEnvironment environment)
    {
        // Only trusted local data reaches the intentionally outdated lab dependency.
        var json = File.ReadAllText(Path.Combine(environment.ContentRootPath, "Data", "products.json"));
        var products = JsonConvert.DeserializeObject<List<Product>>(json,
            new JsonSerializerSettings { MaxDepth = 16, TypeNameHandling = TypeNameHandling.None })
            ?? throw new InvalidOperationException("O catálogo local não pode ser nulo.");
        if (products.Count == 0 || products.Any(p => p.Id <= 0 || p.Price <= 0 ||
                string.IsNullOrWhiteSpace(p.Name)) ||
            products.Select(p => p.Id).Distinct().Count() != products.Count)
            throw new InvalidOperationException("O catálogo local é inválido.");
        Products = products.AsReadOnly();
    }

    public Product? Find(int id) => Products.FirstOrDefault(product => product.Id == id);
}

public sealed class OrderStore
{
    private readonly ConcurrentDictionary<Guid, Order> orders = new();

    public void Add(Order order)
    {
        if (!orders.TryAdd(order.Id, order))
            throw new InvalidOperationException("Não foi possível registrar o pedido.");
    }

    public Order? Find(Guid id) => orders.GetValueOrDefault(id);
}
