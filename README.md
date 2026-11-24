# Ep.16

A diary for every K-drama you've watched, rated, and loved (or didn't). An iOS app built with Expo and React Native, using [TMDB](https://www.themoviedb.org/) for drama, cast and poster data.

## Status

| Step | | |
|---|---|---|
| 1 | Browse K-dramas, drama details, actor filmographies | ✅ |
| 2 | Accounts (email and password) and diary sync with Supabase, account deletion | ✅ |
| 3 | Rewatches, favorite actors, Wrapped, For you, date picker | ✅ |
| 4 | App icon, password reset, privacy policy, EAS build setup | ✅ |
| 5 | Email sender, screenshots, TestFlight, App Store (Sign in with Apple optional) | Next |

## What works now

- **Browse:** popular K-dramas from TMDB as a poster grid with infinite scroll, filtered by genre. Talk, reality, news and kids' shows are left out.
- **Search** by English or Korean title, using the native iOS search bar.
- **Drama details:** backdrop, poster, Korean title, network, episode count, runtime, genres, synopsis and the cast with their characters.
- **Actor pages:** photo, Korean name, biography and every K-drama TMDB credits them in, with their character, newest first.
- **Accounts:** create an account with your email and a password, then sign in on any device. Forgot your password? Get a code by email and set a new one.
- **Diary:** add any drama with a status (Watched, Watching, Want to watch), a half-star rating, notes and episode progress. Synced to your account, with stats and filters in the Diary tab, and the date you finished, started or added it picked from a calendar.
- **Rewatches:** log watching a drama again, each time with its own date, rating and note.
- **Favorite actors:** heart an actor on their page; favorites show at the top of the Diary tab.
- **Wrapped:** your year in K-dramas: dramas finished, episodes, rewatches, average rating, busiest month, top genres, highest rated and the actors who kept showing up.
- **For you:** suggestions on Browse from TMDB's recommendations for the dramas you rated 4 stars or more.
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
2. In **Authentication → Sign In / Providers → Email**, turn off **Confirm email**, so new accounts can sign in straight away without an email.
3. Add the project URL and publishable key from **Project Settings → API keys** to `.env.local` (see `.env.example`).

### Password reset emails

**Forgot password?** emails a code that you type into the app (no link to open). Two settings make that work:

1. **Custom SMTP.** Supabase's built-in sender is for testing only: a few emails an hour, and only to your Supabase team's addresses. Set up a sender such as [Resend](https://resend.com) with a domain you own, then add its SMTP details in **Authentication → Emails → SMTP Settings**.
2. **The Reset password template.** Once custom SMTP is on, templates can be edited. In **Authentication → Emails → Templates → Reset password**, replace the body with the code, for example:

   ```html
   <h2>Reset your Ep.16 password</h2>
   <p>Your code: <strong>{{ .Token }}</strong></p>
   <p>It expires in an hour. If you didn't ask for this, you can ignore this email.</p>
   ```

## Releasing

Builds run on [EAS](https://expo.dev/eas), so no Xcode is needed. You need an Apple Developer Program membership.

1. `npx eas-cli login`, then `npx eas-cli init` to link the project to your Expo account.
2. `npx eas-cli env:push --path .env.local --environment production --environment preview`, since `.env.local` isn't uploaded with the build.
3. `npx eas-cli build --platform ios --profile production`, then `npx eas-cli submit --platform ios` to send it to App Store Connect and TestFlight.

App Store text and privacy answers are in [`store/app-store.md`](store/app-store.md).

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
  components/sign-in.tsx   email and password sign-in
  components/stars.tsx     half-star rating input and display
  constants/theme.ts       colors and fonts for light and dark
  lib/tmdb.ts              TMDB client and data helpers (unit-tested)
  lib/supabase.ts, auth.tsx  Supabase client and sign-in state
  lib/diary.ts             diary queries, saving, and helpers (unit-tested)
supabase/migrations/       database schema and privacy rules
```

## Credits

This product uses the TMDB API but is not endorsed or certified by TMDB.
