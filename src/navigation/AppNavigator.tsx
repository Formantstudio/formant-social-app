import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import LoginScreen        from "../screens/LoginScreen";
import OnboardingScreen   from "../screens/OnboardingScreen";
import VerifyEmailScreen  from "../screens/VerifyEmailScreen";
import FeedScreen         from "../screens/FeedScreen";
import ProfileScreen      from "../screens/ProfileScreen";
import ExploreScreen      from "../screens/ExploreScreen";
import SearchScreen       from "../screens/SearchScreen";
import UserProfileScreen  from "../screens/UserProfileScreen";
import PostDetailScreen   from "../screens/PostDetailScreen";
import CreatePostScreen   from "../screens/CreatePostScreen";
import EditProfileScreen  from "../screens/EditProfileScreen";
import SettingsScreen     from "../screens/SettingsScreen";
import FeedbackScreen     from "../screens/FeedbackScreen";
import { useAuthState }         from "../hooks/useAuthState";
import { useUserProfile }       from "../hooks/useUserProfile";
import { Post }                 from "../components/PostCard";
import { setTelemetryConsent }  from "../lib/telemetry";

export type RootStackParamList = {
  Main:        undefined;
  Onboarding:  undefined;
  Login:       undefined;
  VerifyEmail: undefined;
  UserProfile: { uid: string };
  PostDetail:  { post: Post };
  CreatePost:  undefined;
  EditProfile: undefined;
  Settings:    undefined;
  Feedback:    undefined;
};

export type TabParamList = {
  Feed:      undefined;
  Explore:   undefined;
  Search:    undefined;
  MyProfile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab   = createBottomTabNavigator<TabParamList>();

const TAB_ICONS: Record<string, [string, string]> = {
  Feed:      ["home",   "home-outline"],
  Explore:   ["compass","compass-outline"],
  Search:    ["search", "search-outline"],
  MyProfile: ["person", "person-outline"],
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: "#0a0a0a", borderTopColor: "#1a1a1a" },
        tabBarActiveTintColor: "#00e6e6",
        tabBarInactiveTintColor: "#444",
        tabBarIcon: ({ color, size, focused }) => {
          const [filled, outline] = TAB_ICONS[route.name];
          return <Ionicons name={(focused ? filled : outline) as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Feed"      component={FeedScreen} />
      <Tab.Screen name="Explore"   component={ExploreScreen} />
      <Tab.Screen name="Search"    component={SearchScreen} />
      <Tab.Screen name="MyProfile" component={ProfileScreen} options={{ title: "Profile" }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading: authLoading, emailVerified } = useAuthState();
  const { profile, loading: profileLoading }          = useUserProfile(user?.uid ?? null);

  React.useEffect(() => {
    if (profile) {
      setTelemetryConsent((profile as any).telemetryConsent ?? true);
    }
  }, [profile]);

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
            <Stack.Screen name="EditProfile" component={EditProfileScreen}
              options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="Settings"    component={SettingsScreen}
              options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="Feedback"    component={FeedbackScreen}
              options={{ animation: "slide_from_right" }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
