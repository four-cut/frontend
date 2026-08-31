import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import CaptureNavigator from './CaptureNavigator';
import MainTabNavigator from './MainTabNavigator';
import type {RootStackParamList} from './types';
import FrameBuilderScreen from '../screens/FrameBuilderScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * 탭바 표시 여부가 두 영역을 가른다. (CR-01)
 * MainTabs 는 탭바가 보이는 영역, CaptureFlow·FrameBuilder는 탭바를 덮는다.
 */
export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      <Stack.Screen name="CaptureFlow" component={CaptureNavigator} />
      <Stack.Screen name="FrameBuilder" component={FrameBuilderScreen} />
    </Stack.Navigator>
  );
}
