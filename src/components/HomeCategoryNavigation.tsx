import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { AppText as Text } from './AppText';
import type { MobileNavigationItem } from '../api/quickCartApi';
import { useTheme } from '../theme';

interface Props {
  items: MobileNavigationItem[];
  selectedId: string | null;
  onSelect: (categoryId: string | null) => void;
}

const NavigationIcon = React.memo(({ image, isAll }: { image?: string; isAll: boolean }) => {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  return <View style={styles.icon}>{image && failedImage !== image ? <Image source={{ uri: image }} style={styles.image} resizeMode="contain" onError={() => setFailedImage(image)} /> : <Text style={styles.emoji}>{isAll ? '🛒' : '🛍️'}</Text>}</View>;
});

const HomeCategoryNavigation = React.memo(({ items, selectedId, onSelect }: Props) => {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const itemWidth = Math.min(88, Math.max(72, (width - 16) / 4.5));
  const colors = theme.colors;
  const renderItem = (id: string | null, name: string, image?: string) => (
    <Pressable key={id ?? 'all'} onPress={() => onSelect(id)} accessibilityRole="tab" accessibilityState={{ selected: selectedId === id }} style={[styles.item, { width: itemWidth }]}>
      <NavigationIcon image={image} isAll={!id} />
      <Text numberOfLines={1} style={[styles.label, { color: colors.text }, selectedId === id && styles.selected]}>{name}</Text>
      {selectedId === id && <View style={[styles.underline, { backgroundColor: colors.cyan }]} />}
    </Pressable>
  );
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} style={styles.strip}>
    {renderItem(null, 'All')}
    {items.map(item => renderItem(item.categoryId, item.name, item.image))}
  </ScrollView>;
});

const styles = StyleSheet.create({
  strip: { flexGrow: 0, height: 73 },
  row: { paddingHorizontal: 8, alignItems: 'stretch' },
  item: { height: 73, alignItems: 'center', justifyContent: 'center', gap: 4 },
  icon: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  image: { width: 28, height: 28 },
  emoji: { fontSize: 23 },
  label: { fontSize: 12 },
  selected: { fontWeight: '700' },
  underline: { position: 'absolute', bottom: 0, height: 3, width: 42, borderRadius: 2 },
});

export default HomeCategoryNavigation;
