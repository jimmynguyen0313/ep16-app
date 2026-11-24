import { Stack } from 'expo-router';

import { Fonts, useColors } from '@/constants/theme';

export default function DiaryLayout() {
  const c = useColors();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: c.bg },
        headerShadowVisible: false,
        headerTintColor: c.jade,
        headerTitleStyle: { fontFamily: Fonts.serifBold, color: c.ink },
        headerLargeTitleStyle: { fontFamily: Fonts.serifBold, color: c.ink },
        contentStyle: { backgroundColor: c.bg },
      }}>
      <Stack.Screen name="index" options={{ title: 'My diary', headerLargeTitle: true }} />
      <Stack.Screen name="wrapped" options={{ title: 'Wrapped', headerBackButtonDisplayMode: 'minimal' }} />
    </Stack>
  );
}
