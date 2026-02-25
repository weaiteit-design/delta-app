import React, { useState, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Home, Newspaper, BookOpen, Wrench, MessageCircle, Library } from 'lucide-react-native';

import { contentPipeline } from '../entities/news/contentPipeline';
import { supabase } from '../shared/api/supabaseClient';
import { storageService } from '../entities/user/storageService';
import { ToolData, VerifiedUpdate, LessonData } from '../shared/types/types';

// Screens
import { HomeScreen } from '../pages/HomeScreen';
import { LearnScreen } from '../pages/LearnScreen';
import { UpdatesScreen } from '../pages/UpdatesScreen';
import { ToolsScreen } from '../pages/ToolsScreen';
import { ChatScreen } from '../pages/ChatScreen';
import { LibraryScreen } from '../pages/LibraryScreen';
import { ProfileScreen } from '../pages/ProfileScreen';
import { PreferencesScreen } from '../pages/PreferencesScreen';
import { LessonViewer } from '../pages/LessonViewer';
import { ToolDetail } from '../pages/ToolDetail';
import { ToolGuide } from '../pages/ToolGuide';
import { ArticleReader } from '../pages/ArticleReader';
import { AuthScreen } from '../pages/AuthScreen';
import { OnboardingScreen } from '../pages/OnboardingScreen';

// Navigation param types
export type RootStackParamList = {
    MainTabs: undefined;
    Auth: undefined;
    Onboarding: undefined;
    Profile: undefined;
    Preferences: undefined;
    Lesson: { lesson: LessonData };
    ToolDetail: { tool: ToolData };
    ToolGuide: { tool: ToolData };
    ArticleReader: { article: VerifiedUpdate };
};

export type TabParamList = {
    Home: undefined;
    Learn: undefined;
    Updates: undefined;
    Tools: undefined;
    Chat: undefined;
    Library: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function MainTabs() {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: '#0A0A0F',
                    borderTopColor: 'rgba(255,255,255,0.06)',
                    height: 80,
                    paddingBottom: 20,
                },
                tabBarActiveTintColor: '#818CF8',
                tabBarInactiveTintColor: 'rgba(255,255,255,0.35)',
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: '600',
                },
            }}
        >
            <Tab.Screen
                name="Home"
                options={{ tabBarLabel: 'Home', tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }}
            >
                {({ navigation }) => (
                    <HomeScreen
                        onProfile={() => (navigation as any).navigate('Profile')}
                        onSelectTool={(tool) => (navigation as any).navigate('ToolDetail', { tool })}
                        onSelectUpdate={(update) => (navigation as any).navigate('ArticleReader', { article: update })}
                        onStartLesson={(lesson) => (navigation as any).navigate('Lesson', { lesson })}
                    />
                )}
            </Tab.Screen>
            <Tab.Screen
                name="Updates"
                options={{ tabBarLabel: 'Updates', tabBarIcon: ({ color, size }) => <Newspaper color={color} size={size} /> }}
            >
                {({ navigation }) => (
                    <UpdatesScreen
                        onSelectUpdate={(update) => (navigation as any).navigate('ArticleReader', { article: update })}
                        onStartLesson={(lesson) => (navigation as any).navigate('Lesson', { lesson })}
                    />
                )}
            </Tab.Screen>
            <Tab.Screen
                name="Learn"
                options={{ tabBarLabel: 'Learn', tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} /> }}
            >
                {({ navigation }) => (
                    <LearnScreen
                        onStartLesson={(lesson) => (navigation as any).navigate('Lesson', { lesson })}
                    />
                )}
            </Tab.Screen>
            <Tab.Screen
                name="Tools"
                options={{ tabBarLabel: 'Tools', tabBarIcon: ({ color, size }) => <Wrench color={color} size={size} /> }}
            >
                {({ navigation }) => (
                    <ToolsScreen
                        onSelectTool={(tool) => (navigation as any).navigate('ToolDetail', { tool })}
                    />
                )}
            </Tab.Screen>
            <Tab.Screen
                name="Chat"
                options={{ tabBarLabel: 'Chat', tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} /> }}
            >
                {({ navigation }) => (
                    <ChatScreen
                        onStartLesson={(lesson) => (navigation as any).navigate('Lesson', { lesson })}
                        onSelectTool={(tool) => (navigation as any).navigate('ToolDetail', { tool })}
                    />
                )}
            </Tab.Screen>
            <Tab.Screen
                name="Library"
                options={{ tabBarLabel: 'Library', tabBarIcon: ({ color, size }) => <Library color={color} size={size} /> }}
            >
                {({ navigation }) => (
                    <LibraryScreen
                        onSelectUpdate={(update) => (navigation as any).navigate('ArticleReader', { article: update })}
                        onSelectTool={(tool) => (navigation as any).navigate('ToolDetail', { tool })}
                    />
                )}
            </Tab.Screen>
        </Tab.Navigator>
    );
}

export default function App() {
    const [session, setSession] = useState<any>(null);
    const [authChecking, setAuthChecking] = useState(true);
    const [needsOnboarding, setNeedsOnboarding] = useState(false);

    useEffect(() => {
        // Check onboarding state
        const user = storageService.getUser();
        setNeedsOnboarding(!user.onboardingComplete || !user.name);

        if (supabase.auth) {
            supabase.auth.getSession().then(({ data: { session } }) => {
                setSession(session);
                setAuthChecking(false);
            }).catch(() => setAuthChecking(false));

            const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
                setSession(session);
                if (session?.user) {
                    storageService.syncFromCloud();
                }
            });

            return () => subscription?.unsubscribe();
        } else {
            setAuthChecking(false);
            return () => { };
        }
    }, []);

    // Foreground refresh (AppState replaces document.visibilitychange)
    useEffect(() => {
        const handleAppState = (nextState: AppStateStatus) => {
            if (nextState === 'active') {
                contentPipeline.getUpdates().catch(() => { });
            }
        };
        const sub = AppState.addEventListener('change', handleAppState);
        return () => sub.remove();
    }, []);

    if (authChecking) {
        // Handled by splash screen — return null until ready
        return null;
    }

    const isLoggedIn = session || !supabase.auth;

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <NavigationContainer>
                    <Stack.Navigator
                        screenOptions={{
                            headerShown: false,
                            contentStyle: { backgroundColor: '#0A0A0F' },
                            animation: 'slide_from_right',
                        }}
                    >
                        {!isLoggedIn ? (
                            <Stack.Screen name="Auth">
                                {({ navigation }) => (
                                    <AuthScreen onLogin={() => {
                                        const user = storageService.getUser();
                                        if (!user.onboardingComplete || !user.name) {
                                            setNeedsOnboarding(true);
                                        }
                                        (navigation as any).replace(needsOnboarding ? 'Onboarding' : 'MainTabs');
                                    }} />
                                )}
                            </Stack.Screen>
                        ) : needsOnboarding ? (
                            <Stack.Screen name="Onboarding">
                                {({ navigation }) => (
                                    <OnboardingScreen onComplete={() => {
                                        setNeedsOnboarding(false);
                                        (navigation as any).replace('MainTabs');
                                    }} />
                                )}
                            </Stack.Screen>
                        ) : (
                            <>
                                <Stack.Screen name="MainTabs" component={MainTabs} />
                                <Stack.Screen name="Profile" options={{ animation: 'slide_from_bottom' }}>
                                    {({ navigation }) => (
                                        <ProfileScreen
                                            onClose={() => navigation.goBack()}
                                            onOpenPreferences={() => navigation.navigate('Preferences')}
                                        />
                                    )}
                                </Stack.Screen>
                                <Stack.Screen name="Preferences" options={{ animation: 'slide_from_bottom' }}>
                                    {({ navigation }) => (
                                        <PreferencesScreen
                                            onClose={() => navigation.goBack()}
                                            onSave={() => navigation.goBack()}
                                        />
                                    )}
                                </Stack.Screen>
                                <Stack.Screen name="Lesson">
                                    {({ navigation, route }) => (
                                        <LessonViewer
                                            lesson={(route.params as any).lesson}
                                            onBack={() => navigation.goBack()}
                                        />
                                    )}
                                </Stack.Screen>
                                <Stack.Screen name="ToolDetail">
                                    {({ navigation, route }) => (
                                        <ToolDetail
                                            tool={(route.params as any).tool}
                                            onBack={() => navigation.goBack()}
                                            onStartLesson={(lesson) => navigation.navigate('Lesson', { lesson })}
                                            onOpenGuide={(tool) => navigation.navigate('ToolGuide', { tool })}
                                        />
                                    )}
                                </Stack.Screen>
                                <Stack.Screen name="ToolGuide">
                                    {({ navigation, route }) => (
                                        <ToolGuide
                                            tool={(route.params as any).tool}
                                            onBack={() => navigation.goBack()}
                                            onStartLesson={(lesson) => navigation.navigate('Lesson', { lesson })}
                                        />
                                    )}
                                </Stack.Screen>
                                <Stack.Screen name="ArticleReader">
                                    {({ navigation, route }) => (
                                        <ArticleReader
                                            article={(route.params as any).article}
                                            onBack={() => navigation.goBack()}
                                            onStartLesson={(lesson) => navigation.navigate('Lesson', { lesson })}
                                        />
                                    )}
                                </Stack.Screen>
                            </>
                        )}
                    </Stack.Navigator>
                </NavigationContainer>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}
