# Ep.16

A diary for every K-drama you've watched, rated, and loved (or didn't). An iOS app built with Expo and React Native, using [TMDB](https://www.themoviedb.org/) for drama, cast and poster data.

## Status

| Step | | |
|---|---|---|
| 1 | Browse K-dramas, drama details, actor filmographies | ✅ |
| 2 | Accounts (Sign in with Apple) and diary sync with Supabase, account deletion | Next |
| 3 | Diary: ratings, notes, episode progress, rewatches, favorite actors, Wrapped, For you | |
| 4 | App icon, screenshots, privacy policy, TestFlight, App Store | |

## What works now

- **Browse:** popular K-dramas from TMDB as a poster grid with infinite scroll, filtered by genre. Talk, reality, news and kids' shows are left out.
- **Search** by English or Korean title, using the native iOS search bar.
- **Drama details:** backdrop, poster, Korean title, network, episode count, runtime, genres, synopsis and the cast with their characters.
- **Actor pages:** photo, Korean name, biography and every K-drama TMDB credits them in, with their character, newest first.
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
    about.tsx              about and TMDB credit
  components/ui.tsx        text, posters, headshots, chips, empty states
  constants/theme.ts       colors and fonts for light and dark
  lib/tmdb.ts              TMDB client and data helpers (unit-tested)
```

## Credits

This product uses the TMDB API but is not endorsed or certified by TMDB.
