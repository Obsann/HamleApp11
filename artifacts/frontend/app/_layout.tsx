import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useSegments, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { setBaseUrl } from "@workspace/api-client-react";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/context/AuthContext";

import { API_URL } from "@/constants/api";

setBaseUrl(API_URL);

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: 1,
    },
  },
});

function AuthGate() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const isAtLogin = segments[0] === "login";
    if (!user) {
      if (!isAtLogin) {
        router.replace("/login");
      }
    } else {
      if (isAtLogin) {
        router.replace("/(tabs)");
      }
    }
  }, [user, isLoading, segments]);

  return null;
}

function RootLayoutNav() {
  return (
    <>
      <AuthGate />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen
          name="student/[id]"
          options={{ headerShown: true, title: "Student Profile", headerBackTitle: "Back" }}
        />
        <Stack.Screen
          name="add-report"
          options={{ headerShown: true, title: "Add Report", headerBackTitle: "Back", presentation: "modal" }}
        />
        <Stack.Screen
          name="add-attendance"
          options={{ headerShown: true, title: "Record Attendance", headerBackTitle: "Back", presentation: "modal" }}
        />
        <Stack.Screen
          name="add-user"
          options={{ headerShown: true, title: "Add User", headerBackTitle: "Back", presentation: "modal" }}
        />
        <Stack.Screen
          name="edit-user"
          options={{ headerShown: true, title: "Edit User", headerBackTitle: "Back" }}
        />
        <Stack.Screen
          name="edit-student"
          options={{ headerShown: true, title: "Edit Student", headerBackTitle: "Back" }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardProvider>
                <RootLayoutNav />
              </KeyboardProvider>
            </GestureHandlerRootView>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
