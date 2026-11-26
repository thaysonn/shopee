import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Shop } from './shop';

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  readonly Math = Math;
  readonly shop = inject(Shop);
  readonly category = signal('Todos');
  readonly categories = computed(() => [
    'Todos',
    ...new Set(this.shop.products().map((p) => p.category)),
  ]);
  readonly visibleProducts = computed(() =>
    this.shop
      .products()
      .filter((p) => this.category() === 'Todos' || p.category === this.category()),
  );
  private readonly currency = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  ngOnInit(): void {
    this.shop.loadProducts();
  }

  money(value: number): string {
    return this.currency.format(value);
  }
}
