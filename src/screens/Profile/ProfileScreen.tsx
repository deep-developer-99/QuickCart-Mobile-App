import React, { useState } from 'react';
import {
  Alert,
  Image,
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
import { SafeAreaView } from 'react-native-safe-area-context';

import type { AppDispatch, RootState } from '../../store/store';
import { logout } from '../../store/slices/authSlice';
import { removeToken } from '../../services/secureStorage';
import type { RootStackParamList } from '../../navigation/RootNavigator';

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

const ChevronRight = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="m9 5 7 7-7 7"
      stroke="#777C8D"
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
}) => (
  <Pressable
    style={[styles.menuRow, showDivider && styles.menuRowDivider]}
    onPress={onPress}
  >
    <View style={styles.menuIcon}>{icon}</View>
    <Text style={styles.menuText}>{label}</Text>
    {right ?? <ChevronRight />}
  </Pressable>
);

const ProfileScreen = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const user = useSelector((state: RootState) => state.auth.user);
  const [darkTheme, setDarkTheme] = useState(false);

  const initial = user?.name?.charAt(0)?.toUpperCase() || 'U';

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await removeToken();
          dispatch(logout());
        },
      },
    ]);
  };

  const handleComingSoon = (title: string) => {
    Alert.alert(title, `${title} will be available soon.`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
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
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        bounces={false}
      >
        <Text style={styles.sectionTitle}>Personal Information</Text>

        <View>
          <MenuRow
            icon={<AddressIcon />}
            label="Shipping Address"
            onPress={() => handleComingSoon('Shipping Address')}
          />
          <MenuRow
            icon={<PaymentIcon />}
            label="Payment Method"
            onPress={() => handleComingSoon('Payment Method')}
          />
          <MenuRow
            icon={<OrdersIcon />}
            label="Order History"
            onPress={() => navigation.navigate('OrderHistory')}
            showDivider={false}
          />
        </View>

        <Text style={styles.sectionTitle}>Support & Information</Text>

        <View>
          <MenuRow
            icon={<PrivacyIcon />}
            label="Privacy Policy"
            onPress={() => handleComingSoon('Privacy Policy')}
          />
          <MenuRow
            icon={<TermsIcon />}
            label="Terms & Conditions"
            onPress={() => handleComingSoon('Terms & Conditions')}
          />
          <MenuRow
            icon={<FaqIcon />}
            label="FAQs"
            onPress={() => handleComingSoon('FAQs')}
            showDivider={false}
          />
        </View>

        <Text style={styles.sectionTitle}>Account Management</Text>

        <View>
          <MenuRow
            icon={<DeviceIcon />}
            label="Dark Theme"
            onPress={() => setDarkTheme(value => !value)}
            showDivider={false}
            right={
              <View
                style={[
                  styles.switchTrack,
                  darkTheme && styles.switchTrackActive,
                ]}
              >
                <View
                  style={[
                    styles.switchThumb,
                    darkTheme && styles.switchThumbActive,
                  ]}
                />
              </View>
            }
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  header: {
    height: 88,
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
    fontSize: 14,
    color: '#FFFFFF',
  },

  email: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 11,
    color: '#FFFFFF',
    marginTop: 2,
  },

  logoutButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: {
    paddingBottom: 30,
  },

  sectionTitle: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: '#17171A',
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 16,
  },

  menuRow: {
    minHeight: 61,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
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
    fontSize: 15,
    color: '#777C8D',
  },

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
