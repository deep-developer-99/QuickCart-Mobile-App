import React, { useRef, useState } from 'react';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OnboardingScreenStyles } from './OnboardingScreen.styles';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useTheme } from '../../theme';

import ShoppingIllustration from '../../assets/onboarding/shopping.svg';
import OffersIllustration from '../../assets/onboarding/offers.svg';
import PaymentsIllustration from '../../assets/onboarding/payments.svg';

type Props = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;

type OnboardingItem = {
  id: string;
  title: string;
  description: string;
  Illustration: React.ComponentType<{
    width?: number | string;
    height?: number | string;
  }>;
};

const onboardingData: OnboardingItem[] = [
  {
    id: '1',
    title: 'Explore a wide range of products',
    description:
      'Explore a wide range of products at your fingertips. QuickMart offers an extensive collection to suit your needs.',
    Illustration: ShoppingIllustration,
  },
  {
    id: '2',
    title: 'Unlock exclusive offers and discounts',
    description:
      'Get access to limited-time deals and special promotions available only to our valued customers.',
    Illustration: OffersIllustration,
  },
  {
    id: '3',
    title: 'Safe and secure payments',
    description:
      'QuickMart employs industry-leading encryption and trusted payment gateways to safeguard your financial information.',
    Illustration: PaymentsIllustration,
  },
];

const OnboardingScreen = ({ navigation }: Props) => {
  const { theme } = useTheme();
  const { width, height } = useWindowDimensions();
  const styles = OnboardingScreenStyles(theme.colors, width, height);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<OnboardingItem>>(null);

  const finishOnboarding = () => navigation.replace('Login');

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const screenWidth = event.nativeEvent.layoutMeasurement.width;
    setCurrentIndex(
      Math.max(
        0,
        Math.min(onboardingData.length - 1, Math.round(offsetX / screenWidth)),
      ),
    );
  };

  const goToNext = () => {
    if (currentIndex < onboardingData.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      finishOnboarding();
    }
  };

  const goBack = () => {
    if (currentIndex > 0) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex - 1,
        animated: true,
      });
    }
  };

  const renderItem = ({
    item,
    index,
  }: {
    item: OnboardingItem;
    index: number;
  }) => {
    const Illustration = item.Illustration;
    return (
      <View style={[styles.slide, { width }]}>
        <View style={styles.illustrationCard}>
          <View style={styles.topBar}>
            {index === 0 ? (
              <View style={styles.brand}>
                <View style={styles.brandMark}>
                  <Text style={styles.brandMarkText}>Q</Text>
                </View>
                <Text style={styles.brandText}>QuickMart</Text>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go to previous onboarding page"
                onPress={goBack}
                hitSlop={12}
                style={styles.backButton}
              >
                <Text style={styles.backArrow}>‹</Text>
              </Pressable>
            )}
            {index < onboardingData.length - 1 && (
              <Pressable
                accessibilityRole="button"
                onPress={finishOnboarding}
                hitSlop={10}
                style={styles.skipButton}
              >
                <Text style={styles.skipText}>Skip for now</Text>
              </Pressable>
            )}
          </View>
          <View style={styles.illustrationWrap}>
            <Illustration width="100%" height="100%" />
          </View>
        </View>

        <View style={styles.copy}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <FlatList
        ref={flatListRef}
        data={onboardingData}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
      />

      <View style={styles.bottomSection}>
        {currentIndex === onboardingData.length - 1 ? (
          <View style={styles.finalActions}>
            <Pressable
              style={styles.loginButton}
              onPress={finishOnboarding}
              accessibilityRole="button"
            >
              <Text style={styles.loginButtonText}>Login</Text>
            </Pressable>
            <Pressable
              style={styles.button}
              onPress={finishOnboarding}
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>Get Started</Text>
              <Text style={styles.buttonArrow}>→</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={styles.button}
            onPress={goToNext}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>Next</Text>
          </Pressable>
        )}

        <View style={styles.dots}>
          {onboardingData.map((item, index) => (
            <View
              key={item.id}
              style={index === currentIndex ? styles.activeDot : styles.dot}
            />
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
};

export default OnboardingScreen;
