# Ep.16

A diary for every K-drama you've watched, rated, and loved (or didn't). An iOS app built with Expo and React Native, using [TMDB](https://www.themoviedb.org/) for drama, cast and poster data.

## Status

| Step | | |
|---|---|---|
| 1 | Browse K-dramas, drama details, actor filmographies | ✅ |
| 2 | Accounts (email code sign-in) and diary sync with Supabase, account deletion | ✅ (Sign in with Apple before TestFlight) |
| 3 | Rewatches, favorite actors, Wrapped, For you, date picker | Next |
| 4 | App icon, screenshots, privacy policy, TestFlight, App Store | |

## What works now

- **Browse:** popular K-dramas from TMDB as a poster grid with infinite scroll, filtered by genre. Talk, reality, news and kids' shows are left out.
- **Search** by English or Korean title, using the native iOS search bar.
- **Drama details:** backdrop, poster, Korean title, network, episode count, runtime, genres, synopsis and the cast with their characters.
- **Actor pages:** photo, Korean name, biography and every K-drama TMDB credits them in, with their character, newest first.
- **Accounts:** sign in with a 6-digit code emailed to you, no password. A new email creates an account.
- **Diary:** add any drama with a status (Watched, Watching, Want to watch), a half-star rating, notes and episode progress. Synced to your account, with stats and filters in the Diary tab.
- **Account:** sign out, or permanently delete your account and diary.
- Light and dark themes, matching the original Ep.16 web diary.

## Run it

You need Node 20+ and a free TMDB account.

1. Get a TMDB **API Read Access Token** at [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api).
2. Set up the project:

   ```bash
   npm install
   cp .env.example .env.local   # then paste the token into .env.local
   npx expo start
   ```

3. Scan the QR code with the **Expo Go** app on your iPhone. You can also press `w` to open it in a browser.

`.env.local` is git-ignored. Expo builds `EXPO_PUBLIC_*` values into the app, so the token ships inside it. That's normal for TMDB's free tier, and it could move behind a server later.

## Supabase setup

Accounts and the diary use [Supabase](https://supabase.com) (free tier).

1. Create a project, then run [`supabase/migrations/20261123000000_diary.sql`](supabase/migrations/20261123000000_diary.sql) in **SQL Editor**. It creates the diary tables with row-level security, so each person can only read and change their own rows, plus `delete_my_account()`.
2. In **Authentication → Emails → Templates**, add the code to both the **Confirm signup** and **Magic link** templates, e.g. `<p>Your Ep.16 code: <strong>{{ .Token }}</strong></p>`.
3. Add the project URL and publishable key from **Project Settings → API keys** to `.env.local` (see `.env.example`).

Supabase's built-in email sender is only for testing: it sends a few emails an hour, and only to your Supabase team's addresses. Set up custom SMTP (e.g. Resend) before inviting other people.

## Scripts

```bash
npm test            # unit tests (Jest)
npm run typecheck   # TypeScript
npm run lint        # ESLint
```

## Project layout

```
src/
  app/                     Expo Router screens
    _layout.tsx            fonts, data caching, theme, tab bar
    (browse)/index.tsx     poster grid, genres, search
    (browse)/drama/[id]    drama details and cast
    (browse)/actor/[id]    actor bio and K-drama filmography
    (browse)/log/[id]      sheet for adding a drama to the diary or editing it
    diary/                 your diary: stats, filters, entries
    account.tsx            sign in/out, delete account, TMDB credit
  components/ui.tsx        text, posters, headshots, chips, empty states
  components/sign-in.tsx   email code sign-in
  components/stars.tsx     half-star rating input and display
  constants/theme.ts       colors and fonts for light and dark
  lib/tmdb.ts              TMDB client and data helpers (unit-tested)
  lib/supabase.ts, auth.tsx  Supabase client and sign-in state
  lib/diary.ts             diary queries, saving, and helpers (unit-tested)
supabase/migrations/       database schema and privacy rules
```

## Credits

This product uses the TMDB API but is not endorsed or certified by TMDB.
