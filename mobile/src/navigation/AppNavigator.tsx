import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/HomeScreen';
import PersonelLoginScreen from '../screens/PersonelLoginScreen';
import PersonelRegisterScreen from '../screens/PersonelRegisterScreen';
import PersonelDashboardScreen from '../screens/PersonelDashboardScreen';
import AdminLoginScreen from '../screens/AdminLoginScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="PersonelLogin" component={PersonelLoginScreen} />
        <Stack.Screen name="PersonelRegister" component={PersonelRegisterScreen} />
        <Stack.Screen name="PersonelDashboard" component={PersonelDashboardScreen} />
        <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
        <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}