import React from 'react';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import type {BottomTabBarProps} from '@react-navigation/bottom-tabs';

import {colors, fonts, fontSize} from '../theme';
import {TABS} from './tabs';
import {useAuthGate} from './useAuthGate';

export default function BottomTabBar({state, navigation}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const gate = useAuthGate();

  return (
    <View style={[styles.container, {paddingBottom: insets.bottom || 12}]}>
      {state.routes.map((route, index) => {
        const tab = TABS.find(t => t.name === route.name);
        if (!tab) {
          return null;
        }

        const focused = state.index === index;
        const tint = focused ? colors.textPrimary : colors.textMuted;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (focused || event.defaultPrevented) {
            return;
          }
          const go = () => navigation.navigate(route.name);
          // 로그인이 필요한 탭이면 로그인 화면을 먼저 띄운다.
          if (tab.requiresAuth) {
            gate('Gallery', go);
          } else {
            go();
          }
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{selected: focused}}
            accessibilityLabel={tab.label}
            onPress={onPress}
            style={styles.item}>
            <Image
              source={tab.icon}
              style={[styles.icon, {tintColor: tint}]}
              resizeMode="contain"
            />
            <Text style={[styles.label, {color: tint}]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    paddingTop: 10,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  icon: {
    width: 26,
    height: 26,
  },
  label: {
    fontSize: fontSize.tabLabel,
    fontFamily: fonts.bold,
    includeFontPadding: false,
  },
});
