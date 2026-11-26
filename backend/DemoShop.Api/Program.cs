using System.Text.Json.Serialization;
using DemoShop.Api;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddProblemDetails();
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow);
builder.Services.AddSingleton<Catalog>();
builder.Services.AddSingleton<OrderStore>();
var app = builder.Build();

app.UseExceptionHandler(new ExceptionHandlerOptions
{
    StatusCodeSelector = exception => exception is BadHttpRequestException badRequest
        ? badRequest.StatusCode
        : StatusCodes.Status500InternalServerError
});
app.UseStatusCodePages();
app.Use(async (context, next) =>
{
    await next(context);
    if (context.Response.StatusCode >= 400)
    {
        app.Logger.LogWarning("Request {Method} {Path} returned {StatusCode}",
            context.Request.Method, context.Request.Path, context.Response.StatusCode);
    }
});

app.MapGet("/api/products", (Catalog catalog) => Results.Ok(catalog.Products));
app.MapGet("/api/orders/{id:guid}", (Guid id, OrderStore store) =>
    store.Find(id) is { } order ? Results.Ok(order) : Results.NotFound());

app.MapPost("/api/orders", (CreateOrderRequest request, Catalog catalog, OrderStore store) =>
{
    if (request.Items is not { Count: > 0 } || request.Items.Count > catalog.Products.Count)
        return Results.ValidationProblem(new Dictionary<string, string[]>
        {
            ["items"] = ["Informe um carrinho não vazio, sem produtos repetidos."]
        });

    var seen = new HashSet<int>();
    var items = new List<OrderItem>();
    foreach (var item in request.Items)
    {
        if (item is null || item.Quantity is < 1 or > 99 ||
            !seen.Add(item.ProductId) || catalog.Find(item.ProductId) is not { } product)
        {
            return Results.ValidationProblem(new Dictionary<string, string[]>
            {
                ["items"] = ["Use produtos válidos, sem repetição, com quantidade inteira de 1 a 99."]
            });
        }

        items.Add(new OrderItem(product.Id, product.Name, item.Quantity, product.Price,
            product.Price * item.Quantity));
    }

    var order = new Order(Guid.NewGuid(), DateTimeOffset.UtcNow, items, items.Sum(item => item.Total));
    store.Add(order);
    return Results.Created($"/api/orders/{order.Id}", order);
});

app.Run();

public partial class Program;
