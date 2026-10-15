import React from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import type { AppDispatch, RootState } from '../../store/store';
import { logout } from '../../store/slices/authSlice';
import { useTheme } from '../../theme/ThemeContext';
import { removeToken } from '../../services/secureStorage';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import i18n, {
  changeLanguage,
  supportedLanguages,
  type Language,
} from '../../i18n';

type IconProps = {
  color?: string;
  size?: number;
};

const AddressIcon = ({ color = '#777C8D', size = 24 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 21s7-6.1 7-12A7 7 0 1 0 5 9c0 5.9 7 12 7 12Z"
      stroke={color}
      strokeWidth="1.6"
    />
    <Circle cx="12" cy="9" r="2.25" stroke={color} strokeWidth="1.6" />
  </Svg>
);

const PaymentIcon = ({ color = '#777C8D', size = 24 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect
      x="3"
      y="5"
      width="18"
      height="14"
      rx="2.5"
      stroke={color}
      strokeWidth="1.6"
    />
    <Path
      d="M3 9h18M7 14h4"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <Circle cx="17" cy="15" r="2.25" stroke={color} strokeWidth="1.4" />
  </Svg>
);

const OrdersIcon = ({ color = '#777C8D', size = 24 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect
      x="5"
      y="3"
      width="14"
      height="18"
      rx="2.5"
      stroke={color}
      strokeWidth="1.6"
    />
    <Path
      d="M8.5 8h7M8.5 11.5h7"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <Path
      d="M14 16l1.5 1.5L18 15"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const PrivacyIcon = ({ color = '#777C8D', size = 24 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 3.5 19 6v5.2c0 4.5-2.7 7.8-7 9.3-4.3-1.5-7-4.8-7-9.3V6l7-2.5Z"
      stroke={color}
      strokeWidth="1.6"
    />
    <Path
      d="m9 12 2 2 4-4"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const TermsIcon = ({ color = '#777C8D', size = 24 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect
      x="5"
      y="3"
      width="14"
      height="18"
      rx="2.5"
      stroke={color}
      strokeWidth="1.6"
    />
    <Path
      d="M8.5 8h7M8.5 11.5h7M8.5 15h4"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </Svg>
);

const FaqIcon = ({ color = '#777C8D', size = 24 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M5 5.5A2.5 2.5 0 0 1 7.5 3h9A2.5 2.5 0 0 1 19 5.5v8A2.5 2.5 0 0 1 16.5 16H11l-4.5 4v-4.2A2.5 2.5 0 0 1 5 13.5v-8Z"
      stroke={color}
      strokeWidth="1.6"
    />
    <Path
      d="M10 8.5a2 2 0 1 1 3.2 1.6c-.8.6-1.2.9-1.2 1.8"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <Circle cx="12" cy="14.2" r=".8" fill={color} />
  </Svg>
);

const DeviceIcon = ({ color = '#777C8D', size = 24 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect
      x="6"
      y="3"
      width="12"
      height="18"
      rx="2.5"
      stroke={color}
      strokeWidth="1.6"
    />
    <Path
      d="M10 17.5h4"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </Svg>
);

const LockIcon = ({ color = '#777C8D', size = 24 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect
      x="4"
      y="10"
      width="16"
      height="11"
      rx="2.5"
      stroke={color}
      strokeWidth="1.6"
    />
    <Path
      d="M8 10V7a4 4 0 0 1 8 0v3"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <Circle cx="12" cy="15.5" r="1.2" fill={color} />
  </Svg>
);

const LogoutIcon = ({ color = '#FFFFFF', size = 25 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M14 7V5.5A2.5 2.5 0 0 0 11.5 3h-5A2.5 2.5 0 0 0 4 5.5v13A2.5 2.5 0 0 0 6.5 21h5a2.5 2.5 0 0 0 2.5-2.5V17"
      stroke={color}
      strokeWidth="1.7"
      strokeLinecap="round"
    />
    <Path
      d="M10 12h9M16 8.5 19.5 12 16 15.5"
      stroke={color}
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ChevronRight = ({ color = '#777C8D' }: IconProps) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="m9 5 7 7-7 7"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const MenuRow = ({
  icon,
  label,
  onPress,
  showDivider = true,
  right,
}: {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
  showDivider?: boolean;
  right?: React.ReactNode;
}) => {
  const { theme } = useTheme();

  return (
    <Pressable
      style={[
        styles.menuRow,
        { backgroundColor: theme.colors.surface },
        showDivider && { borderBottomColor: theme.colors.grey50 },
      ]}
      onPress={onPress}
    >
      <View style={styles.menuIcon}>{icon}</View>
      <Text style={[styles.menuText, { color: theme.colors.text }]}>
        {label}
      </Text>
      {right ?? <ChevronRight color={theme.colors.grey150} />}
    </Pressable>
  );
};

const ProfileScreen = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const user = useSelector((state: RootState) => state.auth.user);
  const { theme, mode, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [languageModalVisible, setLanguageModalVisible] = React.useState(false);

  const initial = user?.name?.charAt(0)?.toUpperCase() || 'U';

  const handleLogout = () => {
    Alert.alert(t('profile.logout'), t('profile.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.logout'),
        style: 'destructive',
        onPress: async () => {
          await removeToken();
          dispatch(logout());
        },
      },
    ]);
  };

  const handleLanguageChange = () => {
    setLanguageModalVisible(true);
  };

  const selectLanguage = (language: Language) => {
    changeLanguage(language)
      .catch(error => console.warn('Failed to change language:', error))
      .finally(() => setLanguageModalVisible(false));
  };

  const handleComingSoon = (title: string) => {
    Alert.alert(title, `${title} will be available soon.`);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.cyan }]}
      edges={['top']}
    >
      <View style={[styles.header, { backgroundColor: theme.colors.cyan }]}>
        <View style={styles.headerUser}>
          {user?.profileImage ? (
            <Image source={{ uri: user.profileImage }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
          )}

          <View style={styles.userInfo}>
            <Text style={styles.name} numberOfLines={1}>
              {user?.name || 'QuickMart User'}
            </Text>
            <Text style={styles.email} numberOfLines={1}>
              {user?.email || 'No email available'}
            </Text>
          </View>
        </View>

        <Pressable
          style={styles.logoutButton}
          onPress={handleLogout}
          hitSlop={10}
        >
          <LogoutIcon />
        </Pressable>
      </View>

      <ScrollView
        style={[styles.scrollView, { backgroundColor: theme.colors.cyan }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 8) },
        ]}
        bounces={false}
      >
        <View
          style={[styles.menuPanel, { backgroundColor: theme.colors.surface }]}
        >
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {t('profile.personal')}
          </Text>

          <View>
            <MenuRow
              icon={<AddressIcon color={theme.colors.grey150} />}
              label={t('profile.shipping')}
              onPress={() => navigation.navigate('ShippingAddress')}
            />
            <MenuRow
              icon={<PaymentIcon color={theme.colors.grey150} />}
              label={t('profile.payment')}
              onPress={() => navigation.navigate('PaymentMethod')}
            />
            <MenuRow
              icon={<OrdersIcon color={theme.colors.grey150} />}
              label={t('profile.history')}
              onPress={() => navigation.navigate('OrderHistory')}
              showDivider={false}
            />
          </View>

          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {t('profile.support')}
          </Text>

          <View>
            <MenuRow
              icon={<PrivacyIcon color={theme.colors.grey150} />}
              label={t('profile.privacy')}
              onPress={() => handleComingSoon('Privacy Policy')}
            />
            <MenuRow
              icon={<TermsIcon color={theme.colors.grey150} />}
              label={t('profile.terms')}
              onPress={() => handleComingSoon('Terms & Conditions')}
            />
            <MenuRow
              icon={<FaqIcon color={theme.colors.grey150} />}
              label={t('profile.faqs')}
              onPress={() => handleComingSoon('FAQs')}
              showDivider={false}
            />
          </View>

          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {t('profile.account')}
          </Text>

          <View>
            <MenuRow
              icon={<LockIcon color={theme.colors.grey150} />}
              label={t('profile.changePassword', {
                defaultValue: 'Change Password',
              })}
              onPress={() => handleComingSoon('Change Password')}
            />
            <MenuRow
              icon={<DeviceIcon color={theme.colors.grey150} />}
              label={t('profile.darkTheme')}
              onPress={toggleTheme}
              right={
                <View
                  style={[
                    styles.switchTrack,
                    {
                      backgroundColor:
                        mode === 'dark'
                          ? theme.colors.cyan
                          : theme.colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.switchThumb,
                      mode === 'dark' && styles.switchThumbActive,
                      { backgroundColor: theme.colors.white },
                    ]}
                  />
                </View>
              }
            />
            <MenuRow
              icon={<DeviceIcon color={theme.colors.grey150} />}
              label={t('profile.language')}
              onPress={handleLanguageChange}
              showDivider={false}
              right={
                <Text
                  style={[
                    styles.languageValue,
                    { color: theme.colors.secondaryText },
                  ]}
                >
                  {t(`languages.${i18n.language}`, {
                    defaultValue: t('languages.en'),
                  })}
                </Text>
              }
            />
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={languageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setLanguageModalVisible(false)}
          />
          <View
            style={[
              styles.languageModal,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              {t('profile.language')}
            </Text>
            <Text
              style={[
                styles.modalSubtitle,
                { color: theme.colors.secondaryText },
              ]}
            >
              {t('profile.chooseLanguage')}
            </Text>
            {supportedLanguages.map(language => {
              const selected = i18n.language === language;
              return (
                <Pressable
                  key={language}
                  style={[
                    styles.languageOption,
                    { borderColor: theme.colors.grey50 },
                    selected && {
                      backgroundColor: theme.colors.cyan50,
                      borderColor: theme.colors.cyan,
                    },
                  ]}
                  onPress={() => selectLanguage(language)}
                >
                  <Text style={styles.languageFlag}>
                    {language === 'en'
                      ? '🇬🇧'
                      : language === 'hi'
                      ? '🇮🇳'
                      : language === 'fr'
                      ? '🇫🇷'
                      : '🇯🇵'}
                  </Text>
                  <Text
                    style={[
                      styles.languageOptionText,
                      { color: theme.colors.text },
                    ]}
                  >
                    {t(`languages.${language}`)}
                  </Text>
                  <View
                    style={[
                      styles.radio,
                      {
                        borderColor: selected
                          ? theme.colors.cyan
                          : theme.colors.grey100,
                      },
                    ]}
                  >
                    {selected ? (
                      <View
                        style={[
                          styles.radioSelected,
                          { backgroundColor: theme.colors.cyan },
                        ]}
                      />
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  header: {
    height: 68,
    backgroundColor: '#21D4B4',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerUser: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },

  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 17,
    color: '#21D4B4',
  },

  userInfo: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
  },

  name: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 17,
    color: '#FFFFFF',
  },

  email: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: '#FFFFFF',
    marginTop: 2,
  },

  logoutButton: {
    width: 38,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scrollView: {
    flex: 1,
    backgroundColor: '#21D4B4',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },

  content: {
    flexGrow: 1,
    paddingBottom: 8,
  },

  menuPanel: {
    flexGrow: 1,
    minHeight: '100%',
    paddingTop: 12,
    paddingBottom: 8,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },

  sectionTitle: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 12,
    color: '#17171A',
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 16,
  },

  menuRow: {
    minHeight: 48,
    paddingVertical: 0,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
  },

  menuRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F6',
  },

  menuIcon: {
    width: 36,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },

  menuText: {
    flex: 1,
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 16,
    lineHeight: 22,
    color: '#777C8D',
  },

  languageValue: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    maxWidth: 90,
    textAlign: 'right',
  },

  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.48)',
  },

  languageModal: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },

  modalHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 4,
    backgroundColor: '#BFC2CA',
    marginBottom: 18,
  },

  modalTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 20,
  },

  modalSubtitle: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    marginTop: 5,
    marginBottom: 18,
  },

  languageOption: {
    minHeight: 58,
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 10,
  },

  languageFlag: { fontSize: 23, marginRight: 12 },

  languageOptionText: {
    flex: 1,
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 14,
  },

  radio: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  radioSelected: { width: 10, height: 10, borderRadius: 5 },

  switchTrack: {
    width: 30,
    height: 18,
    borderRadius: 10,
    backgroundColor: '#777C8D',
    padding: 2,
    justifyContent: 'center',
  },

  switchTrackActive: {
    backgroundColor: '#21D4B4',
  },

  switchThumb: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
  },

  switchThumbActive: {
    alignSelf: 'flex-end',
  },
});

export default ProfileScreen;
