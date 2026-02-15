import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Platform, Modal } from 'react-native';
import { Stack, useRouter, useSegments, Redirect } from 'expo-router';
import { Analytics } from '@vercel/analytics/react';
import { Ionicons } from '@expo/vector-icons';
import { AdminAuthProvider, useAdminAuth } from '../../lib/adminAuth';
import { colors, radius, spacing, fonts } from '../../lib/theme';

type IconName = keyof typeof Ionicons.glyphMap;

const ALL_NAV_ITEMS: { href: string; label: string; icon: IconName; pageKey: string }[] = [
  { href: '/admin', label: 'Dashboard', icon: 'bar-chart-outline', pageKey: 'dashboard' },
  { href: '/admin/slangs', label: 'Slogans', icon: 'megaphone-outline', pageKey: 'slangs' },
  { href: '/admin/notice', label: 'Notice', icon: 'notifications-outline', pageKey: 'notice' },
  { href: '/admin/about', label: 'About', icon: 'document-text-outline', pageKey: 'about' },
  { href: '/admin/privacy', label: 'Privacy', icon: 'shield-outline', pageKey: 'privacy' },
  { href: '/admin/links', label: 'Links', icon: 'link-outline', pageKey: 'links' },
  { href: '/admin/users', label: 'Users', icon: 'people-outline', pageKey: 'users' },
];

const SIDEBAR_WIDTH = 240;
const MOBILE_BREAKPOINT = 768;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

export default function AdminLayout() {
  if (Platform.OS !== 'web') {
    return <Redirect href="/" />;
  }

  return (
    <AdminAuthProvider>
      <AdminLayoutInner />
    </AdminAuthProvider>
  );
}

function AdminLayoutInner() {
  const segments = useSegments();
  const router = useRouter();
  const isMobile = useIsMobile();
  const { user, loading, isSuperAdmin, canAccessPage, signOut } = useAdminAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer when switching to desktop
  useEffect(() => {
    if (!isMobile) setDrawerOpen(false);
  }, [isMobile]);

  const handleLogout = async () => {
    setShowLogoutModal(false);
    setDrawerOpen(false);
    await signOut();
    router.replace('/admin/login');
  };

  const navigateTo = (href: string) => {
    setDrawerOpen(false);
    router.replace(href as any);
  };

  const isLoginPage = segments[segments.length - 1] === 'login';

  // Always allow login page to render, even while loading
  if (isLoginPage) {
    return <Stack screenOptions={{ headerShown: false }} />;
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingInner}>
          <ActivityIndicator size="large" color={colors.textMuted} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/admin/login" />;
  }

  // Filter nav items by permissions
  const visibleNavItems = ALL_NAV_ITEMS.filter(item => {
    if (item.pageKey === 'users') return isSuperAdmin;
    return canAccessPage(item.pageKey);
  });

  const currentPath = '/' + segments.join('/');
  const currentPageLabel = visibleNavItems.find(n => n.href === currentPath)?.label || 'Admin Panel';
  const roleLabel = isSuperAdmin ? 'Super Admin' : 'Admin';

  // Shared navigation list
  const renderNavItems = (items: typeof visibleNavItems, onPress?: (href: string) => void) => (
    <View style={styles.navList}>
      {items.map((item) => {
        const isActive = currentPath === item.href;
        const isHovered = hoveredNav === item.href;
        return (
          <Pressable
            key={item.href}
            onPress={() => (onPress || navigateTo)(item.href)}
            onHoverIn={() => setHoveredNav(item.href)}
            onHoverOut={() => setHoveredNav(null)}
            style={[
              styles.navItem,
              isHovered && !isActive && styles.navItemHover,
              isActive && styles.navItemActive,
            ]}
          >
            {isActive && <View style={styles.navActiveBar} />}
            <View style={styles.navIconWrap}>
              <Ionicons name={item.icon} size={20} color={isActive ? '#a78bfa' : colors.textMuted} />
            </View>
            <Text style={[
              styles.navLabel,
              isActive && styles.navLabelActive,
            ]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  // Shared user + logout section
  const renderUserSection = () => (
    <View style={styles.sidebarBottom}>
      <View style={styles.userSection}>
        <View style={styles.userAvatar}>
          <Text style={styles.userAvatarText}>
            {user.email?.charAt(0).toUpperCase() || 'A'}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userEmail} numberOfLines={1}>
            {user.email}
          </Text>
          <Text style={styles.userRole}>{roleLabel}</Text>
        </View>
      </View>
      <Pressable
        onPress={() => { setDrawerOpen(false); setShowLogoutModal(true); }}
        style={styles.logoutBtn}
      >
        <Ionicons name="log-out-outline" size={18} color={colors.destructiveText} />
        <Text style={styles.logoutText}>Log Out</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={[styles.root, isMobile && styles.rootMobile]}>
      <Analytics />

      {/* Desktop Sidebar */}
      {!isMobile && (
        <View style={[styles.sidebar, sidebarCollapsed && styles.sidebarCollapsed]}>
          <View style={styles.brand}>
            <Ionicons name="flash" size={22} color="#a78bfa" />
            {!sidebarCollapsed && (
              <Text style={styles.brandText}>Hamahang</Text>
            )}
          </View>

          {sidebarCollapsed ? (
            <View style={styles.navList}>
              {visibleNavItems.map((item) => {
                const isActive = currentPath === item.href;
                return (
                  <Pressable
                    key={item.href}
                    onPress={() => router.replace(item.href as any)}
                    onHoverIn={() => setHoveredNav(item.href)}
                    onHoverOut={() => setHoveredNav(null)}
                    style={[
                      styles.navItem,
                      hoveredNav === item.href && !isActive && styles.navItemHover,
                      isActive && styles.navItemActive,
                    ]}
                  >
                    {isActive && <View style={styles.navActiveBar} />}
                    <View style={styles.navIconWrap}>
                      <Ionicons name={item.icon} size={20} color={isActive ? '#a78bfa' : colors.textMuted} />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : renderNavItems(visibleNavItems, (href) => router.replace(href as any))}

          <View style={styles.sidebarBottom}>
            <Pressable
              onPress={() => setSidebarCollapsed(!sidebarCollapsed)}
              style={styles.collapseBtn}
            >
              <Ionicons
                name={sidebarCollapsed ? 'chevron-forward' : 'chevron-back'}
                size={14}
                color={colors.textDim}
              />
            </Pressable>
            <View style={styles.userSection}>
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>
                  {user.email?.charAt(0).toUpperCase() || 'A'}
                </Text>
              </View>
              {!sidebarCollapsed && (
                <View style={styles.userInfo}>
                  <Text style={styles.userEmail} numberOfLines={1}>
                    {user.email}
                  </Text>
                  <Text style={styles.userRole}>{roleLabel}</Text>
                </View>
              )}
            </View>
            <Pressable
              onPress={() => setShowLogoutModal(true)}
              style={styles.logoutBtn}
            >
              <Ionicons name="log-out-outline" size={18} color={colors.destructiveText} />
              {!sidebarCollapsed && (
                <Text style={styles.logoutText}>Log Out</Text>
              )}
            </Pressable>
          </View>
        </View>
      )}

      {/* Main content */}
      <View style={styles.mainContent}>
        {/* Top bar */}
        <View style={[styles.topBar, isMobile && styles.topBarMobile]}>
          {isMobile && (
            <Pressable onPress={() => setDrawerOpen(true)} hitSlop={8} style={styles.hamburger}>
              <Ionicons name="menu-outline" size={24} color={colors.text} />
            </Pressable>
          )}
          <Text style={styles.pageTitle}>{currentPageLabel}</Text>
          <View style={styles.topBarRight}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Online</Text>
          </View>
        </View>

        {/* Page content */}
        <View style={[styles.pageContent, isMobile && styles.pageContentMobile]}>
          <Stack screenOptions={{ headerShown: false }} />
        </View>
      </View>

      {/* Mobile drawer */}
      <Modal visible={drawerOpen} transparent animationType="fade" onRequestClose={() => setDrawerOpen(false)}>
        <View style={styles.drawerOverlay}>
          <Pressable style={styles.drawerBackdrop} onPress={() => setDrawerOpen(false)} />
          <View style={styles.drawerContent}>
            <View style={styles.brand}>
              <Ionicons name="flash" size={22} color="#a78bfa" />
              <Text style={styles.brandText}>Hamahang</Text>
            </View>
            {renderNavItems(visibleNavItems)}
            {renderUserSection()}
          </View>
        </View>
      </Modal>

      {/* Logout confirmation modal */}
      <Modal visible={showLogoutModal} transparent animationType="fade" onRequestClose={() => setShowLogoutModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowLogoutModal(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="log-out-outline" size={26} color={colors.destructiveText} />
            </View>
            <Text style={styles.modalTitle}>Log Out</Text>
            <Text style={styles.modalText}>Are you sure you want to log out?</Text>
            <View style={styles.modalActions}>
              <Pressable style={styles.btnOutline} onPress={() => setShowLogoutModal(false)}>
                <Text style={styles.btnOutlineText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.btnDestructive} onPress={handleLogout}>
                <Text style={styles.btnDestructiveText}>Log Out</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.bg,
  },
  rootMobile: {
    flexDirection: 'column',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  loadingInner: {
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: fonts.sizes.sm,
  },

  // -- Access Denied --
  accessDenied: {
    alignItems: 'center',
    gap: 12,
    padding: spacing['2xl'],
  },
  accessDeniedTitle: {
    fontSize: fonts.sizes.xl,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    marginTop: 8,
  },
  accessDeniedText: {
    fontSize: fonts.sizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 8,
  },

  // -- Sidebar (desktop) --
  sidebar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: '#0f0f12',
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    paddingVertical: spacing.lg,
    justifyContent: 'space-between',
  },
  sidebarCollapsed: {
    width: 68,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: 10,
  },
  brandText: {
    fontSize: fonts.sizes.lg,
    fontWeight: fonts.weights.bold,
    color: colors.text,
  },

  // -- Navigation --
  navList: {
    flex: 1,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    gap: 2,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    position: 'relative',
    overflow: 'hidden',
    gap: 10,
  },
  navItemHover: {
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  navItemActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
  },
  navActiveBar: {
    position: 'absolute',
    right: 0,
    top: 6,
    bottom: 6,
    width: 3,
    borderRadius: 2,
    backgroundColor: '#8b5cf6',
  },
  navIconWrap: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    fontSize: fonts.sizes.sm,
    color: colors.textMuted,
    fontWeight: fonts.weights.medium,
  },
  navLabelActive: {
    color: colors.text,
    fontWeight: fonts.weights.semibold,
  },

  // -- Sidebar bottom --
  sidebarBottom: {
    paddingHorizontal: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: spacing.md,
    gap: 8,
  },
  collapseBtn: {
    alignSelf: 'center',
    padding: 6,
    borderRadius: radius.sm,
    marginBottom: 4,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 10,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: fonts.weights.semibold,
  },
  userInfo: {
    flex: 1,
  },
  userEmail: {
    color: colors.text,
    fontSize: 12,
  },
  userRole: {
    color: colors.textDim,
    fontSize: 11,
    marginTop: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    gap: 10,
  },
  logoutText: {
    color: colors.destructiveText,
    fontSize: fonts.sizes.sm,
  },

  // -- Main content --
  mainContent: {
    flex: 1,
    overflow: 'hidden' as any,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: 'rgba(9,9,11,0.8)',
  },
  topBarMobile: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: 12,
  },
  hamburger: {
    padding: 4,
  },
  pageTitle: {
    fontSize: fonts.sizes.lg,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    flex: 1,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  statusText: {
    color: colors.textDim,
    fontSize: fonts.sizes.xs,
  },
  pageContent: {
    flex: 1,
    padding: spacing['2xl'],
    overflow: 'auto' as any,
  },
  pageContentMobile: {
    padding: spacing.md,
  },

  // -- Mobile drawer --
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  drawerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  drawerContent: {
    width: SIDEBAR_WIDTH + 20,
    maxWidth: '80%',
    backgroundColor: '#0f0f12',
    paddingVertical: spacing.lg,
    justifyContent: 'space-between',
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    zIndex: 1,
  },

  // -- Modal --
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: '#18181b',
    borderRadius: radius.xl,
    padding: spacing['2xl'],
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  modalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(127, 29, 29, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: fonts.sizes.lg,
    fontWeight: fonts.weights.semibold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  modalText: {
    fontSize: fonts.sizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  btnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: radius.md,
  },
  btnOutlineText: {
    color: colors.text,
    fontSize: fonts.sizes.sm,
  },
  btnDestructive: {
    backgroundColor: colors.destructive,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: radius.md,
  },
  btnDestructiveText: {
    color: colors.destructiveText,
    fontSize: fonts.sizes.sm,
  },
});
