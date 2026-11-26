import { HttpClient } from '@angular/common/http';
import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import orderBy from 'lodash/orderBy';

export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  description: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  createdAt: string;
  items: { productId: number; name: string; quantity: number; unitPrice: number; total: number }[];
  total: number;
}

@Injectable({ providedIn: 'root' })
export class Shop {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  readonly products = signal<Product[]>([]);
  readonly cart = signal<CartItem[]>([]);
  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly catalogError = signal('');
  readonly cartError = signal('');
  readonly order = signal<Order | null>(null);
  readonly count = computed(() => this.cart().reduce((sum, item) => sum + item.quantity, 0));
  readonly total = computed(
    () =>
      this.cart().reduce(
        (sum, item) => sum + Math.round(item.product.price * 100) * item.quantity,
        0,
      ) / 100,
  );

  loadProducts(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.catalogError.set('');
    this.http
      .get<Product[]>('/api/products')
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        // Sorting only: no dynamic templates reach the intentionally outdated lab package.
        next: (products) => this.products.set(orderBy(products, ['name'], ['asc'])),
        error: (error: unknown) => {
          console.error('Falha ao carregar catálogo', error);
          this.catalogError.set(
            'Não foi possível carregar os produtos. Confira se a API está ligada.',
          );
        },
      });
  }

  quantity(id: number): number {
    return this.cart().find((item) => item.product.id === id)?.quantity ?? 0;
  }

  add(product: Product): void {
    this.setQuantity(product, this.quantity(product.id) + 1);
  }

  setQuantity(product: Product, quantity: number): void {
    if (this.submitting()) return;
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      this.cartError.set('A quantidade deve ser um número inteiro de 1 a 99.');
      return;
    }
    this.cartError.set('');
    this.order.set(null);
    this.cart.update((items) =>
      this.quantity(product.id)
        ? items.map((item) => (item.product.id === product.id ? { ...item, quantity } : item))
        : [...items, { product, quantity }],
    );
  }

  remove(id: number): void {
    if (this.submitting()) return;
    this.cart.update((items) => items.filter((item) => item.product.id !== id));
    this.cartError.set('');
  }

  checkout(): void {
    if (this.submitting()) return;
    if (!this.cart().length) {
      this.cartError.set('Adicione um produto antes de finalizar.');
      return;
    }
    this.submitting.set(true);
    this.cartError.set('');
    this.order.set(null);
    const items = this.cart().map((item) => ({
      productId: item.product.id,
      quantity: item.quantity,
    }));
    this.http
      .post<Order>('/api/orders', { items })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe({
        next: (order) => {
          this.order.set(order);
          this.cart.set([]);
        },
        error: (error: unknown) => {
          console.error('Falha ao registrar pedido', error);
          this.cartError.set('Não foi possível confirmar o pedido. Seu carrinho foi preservado.');
        },
      });
  }
}
