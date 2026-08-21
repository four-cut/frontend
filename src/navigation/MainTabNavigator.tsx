import React from 'react';
import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';

import GalleryScreen from '../screens/GalleryScreen';
import BottomTabBar from './BottomTabBar';
import ShootNavigator from './ShootNavigator';
import type {MainTabParamList} from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

// react-navigation 은 tabBar 를 JSX 가 아니라 함수로 호출한다.
// 컴포넌트를 그대로 넘기면 내부 훅이 호출한 쪽 컴포넌트에 붙어버리므로
// 반드시 JSX 로 감싸서 넘긴다. (모듈 스코프에 둬야 매 렌더마다 새로 안 만들어진다)
const renderTabBar = (props: BottomTabBarProps) => <BottomTabBar {...props} />;

export default function MainTabNavigator() {
  return (
    <Tab.Navigator tabBar={renderTabBar} screenOptions={{headerShown: false}}>
      <Tab.Screen name="Shoot" component={ShootNavigator} />
      <Tab.Screen name="Gallery" component={GalleryScreen} />
    </Tab.Navigator>
  );
}
