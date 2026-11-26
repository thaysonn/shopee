using System.Net;
using System.Net.Http.Json;
using System.Text;
using DemoShop.Api;
using Microsoft.AspNetCore.Mvc.Testing;

namespace DemoShop.Api.Tests;

public sealed class ShopTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient client;

    public ShopTests(WebApplicationFactory<Program> factory) => client = factory.CreateClient();

    [Fact]
    public async Task CatalogContainsSixProducts()
    {
        var products = await client.GetFromJsonAsync<List<Product>>("/api/products");
        Assert.NotNull(products);
        Assert.Equal(6, products.Count);
        Assert.All(products, product => Assert.True(product.Price > 0));
    }

    [Theory]
    [InlineData(1)]
    [InlineData(99)]
    public async Task CheckoutCalculatesTotalAndStoresOrder(int quantity)
    {
        var response = await client.PostAsJsonAsync("/api/orders",
            new { items = new[] { new { productId = 1, quantity }, new { productId = 4, quantity = 2 } } });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var order = await response.Content.ReadFromJsonAsync<Order>();
        Assert.NotNull(order);
        Assert.Equal(189.90m * quantity + 79.90m * 2, order.Total);
        Assert.Equal(2, order.Items.Count);
        var saved = await client.GetFromJsonAsync<Order>(response.Headers.Location);
        Assert.NotNull(saved);
        Assert.Equal(order.Id, saved.Id);
        Assert.Equal(order.Total, saved.Total);
    }

    [Theory]
    [InlineData("""{"items":[]}""")]
    [InlineData("""{"items":null}""")]
    [InlineData("""{"items":[null]}""")]
    [InlineData("""{}""")]
    [InlineData("""{"items":[{"productId":999,"quantity":1}]}""")]
    [InlineData("""{"items":[{"productId":1,"quantity":0}]}""")]
    [InlineData("""{"items":[{"productId":1,"quantity":100}]}""")]
    [InlineData("""{"items":[{"productId":1,"quantity":-1}]}""")]
    [InlineData("""{"items":[{"productId":1,"quantity":1.5}]}""")]
    [InlineData("""{"items":[{"productId":1,"quantity":1},{"productId":1,"quantity":1}]}""")]
    [InlineData("""{"items":[{"productId":1,"quantity":1,"price":0.01}]}""")]
    public async Task InvalidOrdersReturnExplicitClientError(string json)
    {
        var response = await client.PostAsync("/api/orders",
            new StringContent(json, Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task UnknownOrderReturnsNotFound()
    {
        var response = await client.GetAsync($"/api/orders/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
