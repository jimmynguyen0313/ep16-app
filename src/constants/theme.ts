/**
 * Ep.16 design tokens, carried over from the web diary:
 * celadon ground, navy ink, jade accent, gold stars; Gowun Batang for titles, Gowun Dodum for text.
 */
import { useColorScheme } from 'react-native';

export const Colors = {
  light: {
    bg: '#E3EBE5',
    surface: '#F4F8F5',
    surface2: '#EAF0EC',
    ink: '#1C2140',
    muted: '#56607A',
    line: '#C3D1C8',
    jade: '#2E6B5F',
    star: '#C98A12',
    onAccent: '#F4F8F5',
    accent: '#1C2140',
    danger: '#A3352A',
  },
  dark: {
    bg: '#131729',
    surface: '#1B2036',
    surface2: '#22283F',
    ink: '#E1EAE4',
    muted: '#9AA4BE',
    line: '#2E3552',
    jade: '#86C7B6',
    star: '#E6B648',
    onAccent: '#131729',
    accent: '#CFE3D9',
    danger: '#E07A6E',
  },
} as const;

export type Palette = { [K in keyof typeof Colors.light]: string };

export function useColors(): Palette {
  return Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
}

export const Fonts = {
  serif: 'GowunBatang_400Regular',
  serifBold: 'GowunBatang_700Bold',
  sans: 'GowunDodum_400Regular',
} as const;

export const Space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const Radius = { sm: 6, md: 10, lg: 14, pill: 999 } as const;
