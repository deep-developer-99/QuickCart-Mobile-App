import React from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

import type { AppDispatch, RootState } from '../../store/store';
import { logout } from '../../store/slices/authSlice';
import { removeToken } from '../../services/secureStorage';
import { colors, radius, spacing, typography } from '../../theme';

const ProfileScreen = () => {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.profileCard}>
          {user?.profileImage ? (
            <Image source={{ uri: user.profileImage }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
          )}
          <View style={styles.userInfo}>
            <Text style={styles.name} numberOfLines={1}>
              {user?.name || 'QuickCart User'}
            </Text>
            <Text style={styles.email} numberOfLines={1}>
              {user?.email || 'No email available'}
            </Text>
            {user?.phone ? (
              <Text style={styles.phone}>{user.phone}</Text>
            ) : null}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.menuCard}>
          <Pressable style={styles.menuItem} onPress={() => {}}>
            <Text style={styles.menuIcon}>♙</Text>
            <Text style={styles.menuText}>Personal Information</Text>
            <Text style={styles.arrow}>›</Text>
          </Pressable>
          <Pressable style={styles.menuItem} onPress={() => {}}>
            <Text style={styles.menuIcon}>⌖</Text>
            <Text style={styles.menuText}>Saved Addresses</Text>
            <Text style={styles.arrow}>›</Text>
          </Pressable>
          <Pressable style={styles.menuItem} onPress={() => {}}>
            <Text style={styles.menuIcon}>▱</Text>
            <Text style={styles.menuText}>My Orders</Text>
            <Text style={styles.arrow}>›</Text>
          </Pressable>
        </View>

        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  header: {
    height: 60,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F1F5',
  },
  title: { ...typography.body1Medium, color: colors.black },
  content: { padding: spacing.lg, paddingBottom: 100 },
  profileCard: {
    borderWidth: 1,
    borderColor: '#EEF0F8',
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: { width: 70, height: 70, borderRadius: 35 },
  avatarFallback: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.cyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...typography.heading2Bold, color: colors.white },
  userInfo: { flex: 1, marginLeft: spacing.md },
  name: { ...typography.heading3Bold, color: colors.black },
  email: { ...typography.body2Regular, color: colors.grey150, marginTop: 3 },
  phone: { ...typography.captionRegular, color: colors.grey150, marginTop: 3 },
  sectionTitle: {
    ...typography.body2Medium,
    color: colors.black,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  menuCard: {
    borderWidth: 1,
    borderColor: '#EEF0F8',
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  menuItem: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F1F5',
  },
  menuIcon: { fontSize: 23, width: 38, color: colors.grey150 },
  menuText: { ...typography.body2Regular, color: colors.black, flex: 1 },
  arrow: { fontSize: 28, color: colors.grey150 },
  logoutButton: {
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  logoutText: { ...typography.body2Medium, color: colors.red },
});

export default ProfileScreen;
