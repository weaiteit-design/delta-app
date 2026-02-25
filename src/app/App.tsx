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

// Navigation param types
export type RootStackParamList = {
    MainTabs: undefined;
    Auth: undefined;
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
                component={HomeScreen}
                options={{ tabBarLabel: 'Home', tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }}
            />
            <Tab.Screen
                name="Updates"
                component={UpdatesScreen}
                options={{ tabBarLabel: 'Updates', tabBarIcon: ({ color, size }) => <Newspaper color={color} size={size} /> }}
            />
            <Tab.Screen
                name="Learn"
                component={LearnScreen}
                options={{ tabBarLabel: 'Learn', tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} /> }}
            />
            <Tab.Screen
                name="Tools"
                component={ToolsScreen}
                options={{ tabBarLabel: 'Tools', tabBarIcon: ({ color, size }) => <Wrench color={color} size={size} /> }}
            />
            <Tab.Screen
                name="Chat"
                component={ChatScreen}
                options={{ tabBarLabel: 'Chat', tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} /> }}
            />
            <Tab.Screen
                name="Library"
                component={LibraryScreen}
                options={{ tabBarLabel: 'Library', tabBarIcon: ({ color, size }) => <Library color={color} size={size} /> }}
            />
        </Tab.Navigator>
    );
}

export default function App() {
    const [session, setSession] = useState<any>(null);
    const [authChecking, setAuthChecking] = useState(true);

    useEffect(() => {
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
                            <Stack.Screen name="Auth" component={AuthScreen} />
                        ) : (
                            <>
                                <Stack.Screen name="MainTabs" component={MainTabs} />
                                <Stack.Screen name="Profile" component={ProfileScreen} options={{ animation: 'slide_from_bottom' }} />
                                <Stack.Screen name="Preferences" component={PreferencesScreen} options={{ animation: 'slide_from_bottom' }} />
                                <Stack.Screen name="Lesson" component={LessonViewer} />
                                <Stack.Screen name="ToolDetail" component={ToolDetail} />
                                <Stack.Screen name="ToolGuide" component={ToolGuide} />
                                <Stack.Screen name="ArticleReader" component={ArticleReader} />
                            </>
                        )}
                    </Stack.Navigator>
                </NavigationContainer>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}
