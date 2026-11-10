import { Stack } from 'expo-router';

import { Fonts, useColors } from '@/constants/theme';

export default function BrowseLayout() {
  const c = useColors();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: c.bg },
        headerShadowVisible: false,
        headerTintColor: c.jade,
        headerTitleStyle: { fontFamily: Fonts.serifBold, color: c.ink },
        headerLargeTitleStyle: { fontFamily: Fonts.serifBold, color: c.ink },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: c.bg },
      }}>
      <Stack.Screen name="index" options={{ title: 'Ep.16', headerLargeTitle: true }} />
      <Stack.Screen name="drama/[id]" options={{ title: '' }} />
      <Stack.Screen name="actor/[id]" options={{ title: '' }} />
    </Stack>
  );
}
