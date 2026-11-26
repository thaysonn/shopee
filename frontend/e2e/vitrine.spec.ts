import { expect, test } from '@playwright/test';

test('buys products using the real API and the server total', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('.product')).toHaveCount(6);
  await page.getByRole('button', { name: 'Adicionar Fone Aurora', exact: true }).click();
  await page.getByRole('button', { name: 'Aumentar quantidade de Fone Aurora' }).click();
  await page.getByRole('button', { name: 'Adicionar Garrafa Horizonte', exact: true }).click();
  await expect(page.locator('.summary .total')).toContainText(/459,70/);
  await page.screenshot({ path: testInfo.outputPath('vitrine-desktop.png'), fullPage: true });
  const response = page.waitForResponse(
    (response) => response.url().endsWith('/api/orders') && response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Finalizar compra' }).click();
  const orderResponse = await response;
  expect(orderResponse.status()).toBe(201);
  const order = await orderResponse.json();
  expect(order.total).toBe(459.7);
  await expect(page.getByRole('status')).toContainText('Pedido confirmado!');
  await expect(page.getByRole('status')).toContainText(/459,70/);
  await expect(page.getByRole('button', { name: 'Finalizar compra' })).toBeDisabled();
  expect(errors).toEqual([]);
});

test('displays API errors without replacing them with fake data', async ({ page }) => {
  await page.route('**/api/products', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/problem+json',
      body: '{"title":"Unavailable"}',
    }),
  );
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Confira se a API está ligada');
  await expect(page.locator('.product')).toHaveCount(0);
  await page.unroute('**/api/products');
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.locator('.product')).toHaveCount(6);
  await page.getByRole('button', { name: 'Adicionar Fone Aurora', exact: true }).click();
  await page.route('**/api/orders', (route) =>
    route.fulfill({
      status: 500,
      contentType: 'application/problem+json',
      body: '{"title":"Failure"}',
    }),
  );
  await page.getByRole('button', { name: 'Finalizar compra' }).click();
  await expect(page.getByRole('alert')).toContainText('Seu carrinho foi preservado');
  await expect(page.locator('.cart-items li')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Finalizar compra' })).toBeEnabled();
});

test('mobile catalog and cart fit the viewport', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.product')).toHaveCount(6);
  await page.getByRole('button', { name: 'Adicionar Fone Aurora', exact: true }).click();
  await page.getByRole('link', { name: /Sua sacola/ }).click();
  await expect(page.getByRole('button', { name: 'Finalizar compra' })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: testInfo.outputPath('vitrine-mobile.png'), fullPage: true });
});
