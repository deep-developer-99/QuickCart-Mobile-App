import React, { useRef, useState } from 'react';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OnboardingScreenStyles } from './OnboardingScreen.styles';
import { useTheme } from '../../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;

type OnboardingItem = {
  id: string;
  title: string;
  description: string;
};

const onboardingData: OnboardingItem[] = [
  {
    id: '1',
    title: 'Explore a wide range of products',
    description:
      'Discover groceries and everyday essentials from the comfort of your home.',
  },
  {
    id: '2',
    title: 'Unlock exclusive offers and discounts',
    description:
      'Enjoy exciting deals and offers while shopping for your favourite products.',
  },
  {
    id: '3',
    title: 'Safe and secure payments',
    description:
      'Enjoy a simple and secure checkout experience every time you shop.',
  },
];

const OnboardingScreen = ({ navigation }: Props) => {
  const { theme } = useTheme();
  const styles = OnboardingScreenStyles(theme.colors);
  const [currentIndex, setCurrentIndex] = useState(0);

  const flatListRef = useRef<FlatList<OnboardingItem>>(null);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const screenWidth = event.nativeEvent.layoutMeasurement.width;

    const index = Math.round(offsetX / screenWidth);

    setCurrentIndex(index);
  };

  const handleButtonPress = () => {
    if (currentIndex < onboardingData.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      navigation.replace('Login');
    }
  };

  const renderItem = ({ item }: { item: OnboardingItem }) => {
    return (
      <View style={styles.slide}>
        <View style={styles.imagePlaceholder}>
          <Text style={styles.imagePlaceholderText}>QuickCart</Text>
        </View>

        <Text style={styles.title}>{item.title}</Text>

        <Text style={styles.description}>{item.description}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={onboardingData}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
      />

      <View style={styles.bottomSection}>
        {/* Pagination dots */}
        <View style={styles.dots}>
          {onboardingData.map((item, index) => (
            <View
              key={item.id}
              style={index === currentIndex ? styles.activeDot : styles.dot}
            />
          ))}
        </View>

        {/* Button */}
        <Pressable style={styles.button} onPress={handleButtonPress}>
          <Text style={styles.buttonText}>
            {currentIndex === onboardingData.length - 1
              ? 'Get Started'
              : 'Next'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

export default OnboardingScreen;
