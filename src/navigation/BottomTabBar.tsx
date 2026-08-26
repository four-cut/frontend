import React from 'react';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import type {BottomTabBarProps} from '@react-navigation/bottom-tabs';

import {colors, fonts, fontSize} from '../theme';
import {TABS} from './tabs';

export default function BottomTabBar({state, navigation}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

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

          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
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
