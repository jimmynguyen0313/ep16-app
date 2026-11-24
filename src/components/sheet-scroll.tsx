import { createContext, useContext, useRef, type ReactNode } from 'react';
import {
  Keyboard,
  ScrollView,
  TextInput,
  type ScrollViewInstance,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

const RevealContext = createContext<() => void>(() => {});

/**
 * The scroll view for a form sheet. KeyboardAvoidingView misjudges the keyboard's overlap
 * inside an iOS form sheet, so this lets iOS inset the content by exactly the keyboard
 * instead, and lets fields inside ask to be scrolled into view (see useRevealAboveKeyboard).
 */
export function SheetScroll({
  children,
  contentContainerStyle,
}: {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
}) {
  const ref = useRef<ScrollViewInstance>(null);
  const reveal = () => ref.current?.scrollToEnd({ animated: true });
  return (
    <RevealContext.Provider value={reveal}>
      <ScrollView
        ref={ref}
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={contentContainerStyle}>
        {children}
      </ScrollView>
    </RevealContext.Provider>
  );
}

/**
 * Props for a text field near the bottom of a SheetScroll: once the keyboard is up, and each
 * time the field grows a line, scroll to the end so what you're typing stays visible.
 */
function useRevealAboveKeyboard() {
  const reveal = useContext(RevealContext);
  const focused = useRef(false);
  return {
    onFocus: () => {
      focused.current = true;
      const sub = Keyboard.addListener('keyboardDidShow', () => {
        sub.remove();
        reveal();
      });
      // If the keyboard was already up, keyboardDidShow won't fire.
      setTimeout(() => {
        sub.remove();
        if (focused.current) reveal();
      }, 450);
    },
    onBlur: () => {
      focused.current = false;
    },
    onContentSizeChange: () => {
      if (focused.current) reveal();
    },
  };
}

/** A text field for a SheetScroll that stays visible above the keyboard while you type. */
export function SheetTextInput(props: TextInputProps) {
  const reveal = useRevealAboveKeyboard();
  return <TextInput {...props} {...reveal} />;
}
