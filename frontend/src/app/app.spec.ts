import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { Product, Shop } from './shop';

const product: Product = {
  id: 1,
  name: 'Fone Aurora',
  category: 'Áudio',
  price: 189.9,
  description: 'Conforto.',
};
const other: Product = {
  id: 4,
  name: 'Garrafa Horizonte',
  category: 'Lifestyle',
  price: 79.9,
  description: 'Leve.',
};

describe('Vitrine', () => {
  let http: HttpTestingController;
  let shop: Shop;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    shop = TestBed.inject(Shop);
  });

  afterEach(() => http.verify());

  it('renders the catalog, filters and empty cart', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    http.expectOne('/api/products').flush([other, product]);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelectorAll('.product').length).toBe(2);
    expect(element.querySelector('.empty-cart')?.textContent).toContain(
      'Espaço para boas escolhas',
    );
    fixture.componentInstance.category.set('Áudio');
    await fixture.whenStable();
    expect(element.querySelectorAll('.product').length).toBe(1);
    expect(shop.products().map((p) => p.id)).toEqual([1, 4]);
  });

  it('renders the loading and empty catalog states', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain('Preparando a vitrine');
    http.expectOne('/api/products').flush([]);
    await fixture.whenStable();
    expect(element.textContent).toContain('Nenhum produto disponível');
  });

  it('shows catalog failure and allows retry', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    shop.loadProducts();
    http.expectOne('/api/products').flush({}, { status: 503, statusText: 'Unavailable' });
    expect(shop.catalogError()).toContain('API');
    expect(shop.loading()).toBe(false);
    shop.loadProducts();
    http.expectOne('/api/products').flush([product]);
    expect(shop.catalogError()).toBe('');
    expect(shop.products()).toEqual([product]);
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  it('adds, changes and removes items with precise totals', () => {
    shop.add(product);
    shop.add(other);
    shop.setQuantity(product, 2);
    expect(shop.count()).toBe(3);
    expect(shop.total()).toBe(459.7);
    shop.remove(other.id);
    expect(shop.total()).toBe(379.8);
    shop.remove(product.id);
    expect(shop.count()).toBe(0);
  });

  it.each([0, 100, -1, 1.5, NaN])(
    'rejects invalid quantity %s without changing cart',
    (quantity) => {
      shop.add(product);
      shop.setQuantity(product, quantity);
      expect(shop.quantity(product.id)).toBe(1);
      expect(shop.cartError()).toContain('1 a 99');
    },
  );

  it('accepts 99 and prevents exceeding the limit', () => {
    shop.setQuantity(product, 99);
    expect(shop.quantity(product.id)).toBe(99);
    shop.add(product);
    expect(shop.quantity(product.id)).toBe(99);
    expect(shop.cartError()).not.toBe('');
  });

  it('rejects empty checkout', () => {
    shop.checkout();
    http.expectNone('/api/orders');
    expect(shop.cartError()).toContain('Adicione');
  });

  it('sends only IDs and quantities, blocks duplicates and uses server total', () => {
    shop.add(product);
    shop.checkout();
    shop.checkout();
    shop.add(other);
    shop.remove(product.id);
    const request = http.expectOne('/api/orders');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ items: [{ productId: 1, quantity: 1 }] });
    expect(shop.count()).toBe(1);
    request.flush({ id: 'order-1', createdAt: '2026-01-01', items: [], total: 180 });
    expect(shop.order()?.total).toBe(180);
    expect(shop.cart()).toEqual([]);
    expect(shop.submitting()).toBe(false);
  });

  it('preserves cart and shows checkout failure', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    shop.add(product);
    shop.checkout();
    http.expectOne('/api/orders').flush({}, { status: 500, statusText: 'Server error' });
    expect(shop.quantity(product.id)).toBe(1);
    expect(shop.cartError()).toContain('preservado');
    expect(shop.submitting()).toBe(false);
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});
