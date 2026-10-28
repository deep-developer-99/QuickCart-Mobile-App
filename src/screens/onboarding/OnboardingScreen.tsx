import { AppText as Text } from '../../components/AppText';
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  View,
  useWindowDimensions,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OnboardingScreenStyles } from './OnboardingScreen.styles';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useTheme } from '../../theme';
import BackButton from '../../components/common/BackButton';

import ShoppingIllustration from '../../assets/onboarding/shopping.svg';
import OffersIllustration from '../../assets/onboarding/offers.svg';
import PaymentsIllustration from '../../assets/onboarding/payments.svg';

type Props = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;

type OnboardingItem = {
  id: string;
  Illustration: React.ComponentType<{
    width?: number | string;
    height?: number | string;
  }>;
};

const onboardingData: OnboardingItem[] = [
  {
    id: '1',
    Illustration: ShoppingIllustration,
  },
  {
    id: '2',
    Illustration: OffersIllustration,
  },
  {
    id: '3',
    Illustration: PaymentsIllustration,
  },
];

const OnboardingScreen = ({ navigation }: Props) => {
  const { t } = useTranslation();
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
                <Text style={styles.brandText}>QuickCart</Text>
              </View>
            ) : (
              <BackButton
                onPress={goBack}
                hitSlop={12}
                style={styles.backButton}
                accessibilityLabel={t('ui.onboarding.previous')}
              />
            )}
            {index < onboardingData.length - 1 && (
              <Pressable
                accessibilityRole="button"
                onPress={finishOnboarding}
                hitSlop={10}
                style={styles.skipButton}
              >
                <Text style={styles.skipText}>{t('ui.onboarding.skip')}</Text>
              </Pressable>
            )}
          </View>
          <View style={styles.illustrationWrap}>
            <Illustration width="100%" height="100%" />
          </View>
        </View>

        <View style={styles.copy}>
          <Text style={styles.title}>{t(`ui.onboarding.title${index + 1}`)}</Text>
          <Text style={styles.description}>{t(`ui.onboarding.description${index + 1}`)}</Text>
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
              <Text style={styles.loginButtonText}>{t('ui.onboarding.login')}</Text>
            </Pressable>
            <Pressable
              style={styles.button}
              onPress={finishOnboarding}
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>{t('ui.onboarding.getStarted')}</Text>
              <Text style={styles.buttonArrow}>→</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={styles.button}
            onPress={goToNext}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>{t('ui.onboarding.next')}</Text>
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
