import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {
  StyleSheet,
  Text as NativeText,
  TextInput as NativeTextInput,
} from 'react-native';

import { AppText, AppTextInput } from '../src/components/AppText';
import { fontFamilies } from '../src/theme/globalFont';

describe('app typography components', () => {
  it('applies a weight-matched bundled face through conditional style arrays', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <AppText
          style={[
            { fontWeight: '600' },
            false && { color: 'red' },
            { fontSize: 18 },
          ]}
        >
          Label
        </AppText>,
      );
    });

    const style = StyleSheet.flatten(
      renderer!.root.findByType(NativeText).props.style,
    );
    expect(style).toMatchObject({
      fontFamily: fontFamilies.semiBold,
      fontWeight: '600',
      fontSize: 18,
    });
  });

  it('keeps an explicitly selected font family', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <AppText style={{ fontFamily: 'Custom Display', fontWeight: '700' }}>
          Label
        </AppText>,
      );
    });

    const style = StyleSheet.flatten(
      renderer!.root.findByType(NativeText).props.style,
    );
    expect(style).toMatchObject({
      fontFamily: 'Custom Display',
      fontWeight: '700',
    });
  });

  it('uses the app font for input text and preserves input props', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <AppTextInput
          accessibilityLabel="Search"
          placeholder="Search products"
          style={{ fontWeight: '500', color: 'navy' }}
        />,
      );
    });

    const input = renderer!.root.findByType(NativeTextInput);
    const style = StyleSheet.flatten(input.props.style);
    expect(input.props.accessibilityLabel).toBe('Search');
    expect(input.props.placeholder).toBe('Search products');
    expect(style).toMatchObject({
      fontFamily: fontFamilies.medium,
      fontWeight: '500',
      color: 'navy',
    });
  });
});
