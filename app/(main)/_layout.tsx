import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AnimatedTabBar } from '../../components/ui/AnimatedTabBar';
import { TabIcon } from '../../components/ui/TabIcon';

export default function MainLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.slogans_list'),
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'list' : 'list-outline'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="slangs"
        options={{
          title: t('tabs.slogan'),
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'megaphone' : 'megaphone-outline'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: t('tabs.more'),
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'ellipsis-horizontal-circle' : 'ellipsis-horizontal-circle-outline'} focused={focused} />
          ),
        }}
      />
      {/* Hidden screens pushed from More */}
      <Tabs.Screen name="suggest" options={{ href: null }} />
      <Tabs.Screen name="about" options={{ href: null }} />
      <Tabs.Screen name="privacy" options={{ href: null }} />
    </Tabs>
  );
}
