import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import GuideScreen from '../screens/GuideScreen';
import HomeScreen from '../screens/HomeScreen';
import type {ShootStackParamList} from './types';

const Stack = createNativeStackNavigator<ShootStackParamList>();

/** 찰칵 탭. 여기까지는 탭바가 보인다. (CR-01) */
export default function ShootNavigator() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Guide" component={GuideScreen} />
    </Stack.Navigator>
  );
}
