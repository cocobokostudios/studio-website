import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

const siteLinks = [
  { label: 'Home', href: '/' },
  { label: 'Games', href: '/#games' },
  { label: 'About', href: '/#about' },
  { label: 'Get Notified', href: '/#get-notified' },
];

test('serves the release verified by this workflow', async ({ request }) => {
  test.skip(process.env.CHECK_RELEASE !== 'true', 'Only used to verify a deployed artifact');
  const release = await readFile('dist/release.txt', 'utf8');
  await expect.poll(async () => {
    const response = await request.get('/release.txt', {
      params: { release: release.trim() },
      headers: { 'Cache-Control': 'no-cache' },
    });
    return response.ok() ? await response.text() : String(response.status());
  }, { timeout: 20_000 }).toBe(release);
});

test('renders both games and supports desktop and mobile navigation', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const navigation = page.getByRole('navigation', { name: 'Primary' });
  const menuLinks = navigation.locator('#primary-menu').getByRole('link');
  const labels = siteLinks.map(({ label }) => label);

  await expect(page.locator('main > :is(header, section)').evaluateAll(sections =>
    sections.map(section => section.id || section.localName),
  )).resolves.toEqual(['header', 'games', 'about', 'get-notified']);
  await expect(menuLinks).toHaveText(labels);

  await navigation.getByRole('link', { name: 'Games' }).click();
  await expect(page).toHaveURL(/#games$/);
  for (const game of ['Passenger', 'Agent']) {
    await expect(page.getByRole('heading', { name: game, exact: true })).toBeVisible();
  }
  for (const image of await page.locator('#games img').all()) {
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth))
      .toBeGreaterThan(0);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  const toggle = navigation.getByRole('button', { name: 'Toggle navigation' });
  const about = navigation.getByRole('link', { name: 'About' });
  await expect(about).toBeHidden();
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(menuLinks).toHaveText(labels);
  await about.click();
  await expect(page).toHaveURL(/#about$/);
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('footer links follow the site order and reach the homepage from secondary pages', async ({ page }) => {
  const footer = page.getByRole('navigation', { name: 'Footer' });
  await page.goto('/credits/');
  await expect(footer.getByRole('link')).toHaveText([
    ...siteLinks.map(({ label }) => label),
    'Privacy Policy', 'Code of Conduct', 'Generative AI Disclosure', 'Credits',
  ]);

  for (const { label, href } of siteLinks) {
    await page.goto('/credits/');
    await footer.getByRole('link', { name: label, exact: true }).click();
    await expect(page).toHaveURL(href);
  }
});

test('falls back to the analytics CDN when the vendored script is unavailable', async ({ page }) => {
  await page.route('**/vendor/simple-analytics/latest.js', route => route.abort());
  await page.route('https://scripts.simpleanalyticscdn.com/latest.js', route => route.fulfill({
    contentType: 'application/javascript',
    body: 'document.documentElement.dataset.analyticsLoaded = "true";',
  }));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-analytics-loaded', 'true');
});

test('all internal page links and image variants resolve', async ({ page, request }) => {
  const targets = new Set<string>();
  for (const route of ['/', '/privacy-policy/', '/code-of-conduct/', '/generative-ai-disclosure/', '/credits/']) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    const links = await page.locator('a[href], img[src], img[srcset]').evaluateAll(elements => {
      return elements.flatMap(element => {
        if (element instanceof HTMLAnchorElement) return [element.href];
        const image = element as HTMLImageElement;
        return [image.src, ...image.srcset.split(',').map(candidate => candidate.trim().split(/\s+/)[0])];
      }).filter(Boolean).map(target => new URL(target, document.baseURI))
        .filter(url => url.origin === location.origin)
        .map(url => url.pathname + url.search);
    });
    for (const link of links) targets.add(link);
  }
  for (const target of targets) expect((await request.get(target)).status(), target).toBe(200);
});

test('deployed homepage renders the newsletter form', async ({ page }) => {
  test.skip(!process.env.SITE_URL, 'Requires the deployed site and MailerLite');
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-mailerlite-embed] form')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('[data-mailerlite-root]')).toHaveAttribute('aria-busy', 'false');
});
