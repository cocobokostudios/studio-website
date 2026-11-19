# Cocoboko Studios website

The Cocoboko Studios marketing site, built with Eleventy, WebC, Tailwind CSS, and Alpine.js.

## Requirements

- Node.js 22 or newer
- pnpm 11.15.0

The repository uses `pnpm-workspace.yaml` to explicitly approve the native build steps required by Sharp and Eleventy’s file watcher.

## Development

```sh
pnpm install
pnpm run dev
```

The development server runs at `http://localhost:4321` and watches both WebC templates and Tailwind styles.

## Production

```sh
pnpm run build
pnpm run preview
```

The production site is written to `dist/`. The build verifies committed third-party scripts, generates responsive images, compiles the WebC site, and writes the final Tailwind stylesheet.

## Tests

```sh
pnpm run build
pnpm run test:e2e
```

The Playwright suite checks every public route, shared landmarks, conditional MailerLite loading, navigation, compiled assets, and generated images.

## Project structure

```text
src/
  _data/                 Structured site data
  _includes/components/  Reusable WebC components
  _includes/layouts/     Shared WebC layouts
  assets/images/         Original image sources
  content/               Markdown content pages
  styles/                Tailwind source CSS
  *.webc                 WebC application pages
public/
  images/generated/      Generated responsive images (ignored by Git)
  vendor/                Reviewed third-party script snapshots
scripts/                 Asset and vendor maintenance scripts
tests/                   Production-facing Playwright tests
dist/                    Generated production site (ignored by Git)
```

WebC is the default template language. Shared navigation, footer, metadata, analytics, and optional integrations belong in `src/_includes/layouts/base.webc`. Long-form editorial and policy pages live as Markdown in `src/content/` and use `src/_includes/layouts/content.webc`; interactive or component-driven pages remain WebC templates.

## Images

Keep original images in `src/assets/images/`. Add game image metadata to `src/_data/games.json`, then run `pnpm run build:images`. Do not place source images in `public/`, because everything in that directory is copied to the production site.

Generated images and the compiled stylesheet are build artifacts and are not committed.

## Vendored scripts

Production builds do not download third-party JavaScript. The browser loads the committed MailerLite snapshot from the site's own `/vendor/` path, while committed MailerLite and Simple Analytics snapshots are checked against `scripts/vendor-lock.json` on every build.

To intentionally update both scripts and refresh their checksums:

```sh
pnpm run update:vendor
```

Review the resulting vendor diffs before committing them.

## Deployment

The **Build and Deploy** workflow verifies branch pushes and pull requests under the Workers runtime. From main, it deploys the same verified artifact to staging and production in the **Cocoboko Studios** Cloudflare account and runs the tests against each live deployment. Deployment requires the GitHub Actions secret `CLOUDFLARE_API_TOKEN` with Workers Scripts Edit for the studio account.

- Staging is served at [studio-website-staging.cocobokostudios.workers.dev](https://studio-website-staging.cocobokostudios.workers.dev/).
- Production is served at [studio-website.cocobokostudios.workers.dev](https://studio-website.cocobokostudios.workers.dev/) before DNS cutover.

The workflow summary records the commit and artifact digest. The deployment logs record each Worker version and the smoke tests verify the commit and digest served in `/release.txt`.

The production Worker serves both [cocobokostudios.com](https://cocobokostudios.com/) and [www.cocobokostudios.com](https://www.cocobokostudios.com/). To run the Playwright suite against a live hostname, set `SITE_URL` to its HTTPS URL before running `pnpm run test:e2e`.
