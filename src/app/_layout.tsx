import { GowunBatang_400Regular, GowunBatang_700Bold } from '@expo-google-fonts/gowun-batang';
import { GowunDodum_400Regular } from '@expo-google-fonts/gowun-dodum';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { AuthProvider } from '@/lib/auth';
import { TmdbError } from '@/lib/tmdb';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 30, // TMDB data changes slowly
      gcTime: 1000 * 60 * 60,
      retry: (count, err) => !(err instanceof TmdbError && [0, 401, 404].includes(err.status)) && count < 2,
    },
  },
});

export default function RootLayout() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const c = Colors[scheme];
  const [loaded, error] = useFonts({
    GowunBatang_400Regular,
    GowunBatang_700Bold,
    GowunDodum_400Regular,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);
  if (!loaded && !error) return null;

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      background: c.bg,
      card: c.bg,
      text: c.ink,
      border: c.line,
      primary: c.jade,
    },
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider value={navTheme}>
          <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
          <NativeTabs
            backgroundColor={c.bg}
            indicatorColor={c.surface2}
            tintColor={c.jade}
            labelStyle={{ selected: { color: c.ink } }}>
            <NativeTabs.Trigger name="(browse)">
              <NativeTabs.Trigger.Label>Browse</NativeTabs.Trigger.Label>
              <NativeTabs.Trigger.Icon
                sf={{
                  default: 'rectangle.stack',
                  selected: 'rectangle.stack.fill',
                }}
                src={require('@/assets/images/tabIcons/home.png')}
              />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="diary">
              <NativeTabs.Trigger.Label>Diary</NativeTabs.Trigger.Label>
              <NativeTabs.Trigger.Icon
                sf={{ default: 'book', selected: 'book.fill' }}
                src={require('@/assets/images/tabIcons/explore.png')}
              />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="account">
              <NativeTabs.Trigger.Label>Account</NativeTabs.Trigger.Label>
              <NativeTabs.Trigger.Icon
                sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }}
                src={require('@/assets/images/tabIcons/explore.png')}
              />
            </NativeTabs.Trigger>
          </NativeTabs>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
