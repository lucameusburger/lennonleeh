This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Content and editing

The public home page and `/portfolio.pdf` intentionally serve the PDF directly.
The HTML viewer and in-page editor are available at `/portfolio`; open
`/portfolio?einblick-login=1` to sign in. Einblick's Portfolio page links to this
viewer through the manifest path. `/privacy` has its own editable page content.

`content/einblick.content.ts` declares the editorial fields. Reads stay in the
server-only content module and use tagged caching and draft preview. The build
syncs the manifest only when `VERCEL_ENV=production`; preview and local builds do
not change production structure. Set `EINBLICK_API_KEY` on the server,
`NEXT_PUBLIC_EINBLICK_SITE_KEY` for editor/analytics, and
`EINBLICK_REVALIDATE_SECRET` for `/api/einblick/revalidate` (matching the API key's
webhook configuration). The draft-mode route uses the existing API key.

The legacy `site-settings` record and its original PDF are retained as migration
rollback data. The Portfolio page owns an independent copy of that PDF; uploads
must belong to that page's media folder.
