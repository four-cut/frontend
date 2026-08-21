import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import CaptureScreen from '../screens/CaptureScreen';
import LayoutSelectScreen from '../screens/LayoutSelectScreen';
import LogoSelectScreen from '../screens/LogoSelectScreen';
import PhotoSelectScreen from '../screens/PhotoSelectScreen';
import RotateGuideScreen from '../screens/RotateGuideScreen';
import {CaptureSessionProvider} from '../state/CaptureSessionContext';
import type {CaptureStackParamList} from './types';

const Stack = createNativeStackNavigator<CaptureStackParamList>();

/**
 * 촬영 플로우. 루트 스택의 화면이라 탭바를 덮는다. (CR-01)
 * 세션 상태는 이 네비게이터가 살아 있는 동안만 유지된다. (CR-02)
 */
export default function CaptureNavigator() {
  return (
    <CaptureSessionProvider>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        <Stack.Screen name="LayoutSelect" component={LayoutSelectScreen} />
        <Stack.Screen name="RotateGuide" component={RotateGuideScreen} />
        <Stack.Screen name="Capture" component={CaptureScreen} />
        <Stack.Screen name="PhotoSelect" component={PhotoSelectScreen} />
        <Stack.Screen name="LogoSelect" component={LogoSelectScreen} />
      </Stack.Navigator>
    </CaptureSessionProvider>
  );
}
