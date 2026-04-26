import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import LoginScreen from "../screens/LoginScreen";
import OnboardingScreen from "../screens/OnboardingScreen";
import VerifyEmailScreen from "../screens/VerifyEmailScreen";
import FeedScreen from "../screens/FeedScreen";
import ProfileScreen from "../screens/ProfileScreen";
import UserProfileScreen from "../screens/UserProfileScreen";
import PostDetailScreen from "../screens/PostDetailScreen";
import CreatePostScreen from "../screens/CreatePostScreen";
import { useAuthState } from "../hooks/useAuthState";
import { useUserProfile } from "../hooks/useUserProfile";
import { Post } from "../components/PostCard";

export type RootStackParamList = {
  Main:        undefined;
  Onboarding:  undefined;
  Login:       undefined;
  VerifyEmail: undefined;
  UserProfile: { uid: string };
  PostDetail:  { post: Post };
  CreatePost:  undefined;
};

export type TabParamList = {
  Feed:      undefined;
  MyProfile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab   = createBottomTabNavigator<TabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: "#0a0a0a", borderTopColor: "#1a1a1a" },
        tabBarActiveTintColor: "#00e6e6",
        tabBarInactiveTintColor: "#444",
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            Feed:      "home-outline",
            MyProfile: "person-outline",
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Feed"      component={FeedScreen} />
      <Tab.Screen name="MyProfile" component={ProfileScreen} options={{ title: "Profile" }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading: authLoading, emailVerified } = useAuthState();
  const { profile, loading: profileLoading }          = useUserProfile(user?.uid ?? null);

  if (authLoading || (user && profileLoading)) return null;

  const needsVerification = user && !emailVerified;
  const needsOnboarding   = user && emailVerified && !profile?.displayName;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: "fade" }}>
        {!user ? (
          <Stack.Screen name="Login"       component={LoginScreen} />
        ) : needsVerification ? (
          <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
        ) : needsOnboarding ? (
          <Stack.Screen name="Onboarding"  component={OnboardingScreen} />
        ) : (
          <>
            <Stack.Screen name="Main"        component={MainTabs} />
            <Stack.Screen name="UserProfile" component={UserProfileScreen}
              options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="PostDetail"  component={PostDetailScreen}
              options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="CreatePost"  component={CreatePostScreen}
              options={{ animation: "slide_from_bottom" }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
