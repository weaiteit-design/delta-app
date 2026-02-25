import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
} from 'react-native';
import { deltaService, CURATED_TOOLS } from '../shared/api/deltaService';
import { storageService } from '../entities/user/storageService';
import { ToolData, LessonData } from '../shared/types/types';
import { Send, Play, Clock, BookOpen } from 'lucide-react-native';
import { colors, radius } from '../shared/platform/theme';

interface ChatScreenProps {
    onStartLesson: (lesson: LessonData) => void;
    onSelectTool: (tool: ToolData) => void;
}

interface ChatMsg {
    id: string;
    role: 'user' | 'ai';
    text: string;
    lessonCard?: { title: string; duration: string; xp: number; toolName?: string };
}

const SUGGESTED_PROMPTS = [
    "What's new in AI today?",
    "Best tools for writing",
    "Explain RAG to me",
    "How do I use Claude better?",
];

export function ChatScreen({ onStartLesson, onSelectTool }: ChatScreenProps) {
    const user = storageService.getUser();
    const [messages, setMessages] = useState<ChatMsg[]>([
        {
            id: 'welcome',
            role: 'ai',
            text: `Hey ${user.name}! 👋 I'm Delta, your AI learning companion. Ask me anything about AI tools, the latest news, or what to learn next!`,
        },
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<ScrollView>(null);
    const chatInitialized = useRef(false);

    useEffect(() => {
        if (!chatInitialized.current) {
            deltaService.initChat();
            chatInitialized.current = true;
        }
    }, []);

    useEffect(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isTyping) return;
        const userText = input.trim();
        const userMsg: ChatMsg = { id: `u${Date.now()}`, role: 'user', text: userText };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            const reply = await deltaService.sendChatMessage(userText);

            // Check if reply mentions any curated tool
            const mentionedTool = CURATED_TOOLS.find(t =>
                reply.toLowerCase().includes(t.name.toLowerCase()) ||
                reply.toLowerCase().includes(t.domain.toLowerCase())
            );

            const aiMsg: ChatMsg = {
                id: `ai${Date.now()}`,
                role: 'ai',
                text: reply,
                lessonCard: mentionedTool ? {
                    title: `Master ${mentionedTool.name} in 3 min`,
                    duration: '3 min',
                    xp: 50,
                    toolName: mentionedTool.name,
                } : undefined,
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (err) {
            const errorMsg: ChatMsg = {
                id: `err${Date.now()}`,
                role: 'ai',
                text: "Session interrupted. I'm still here, but my connection flickered. Please try your message again! 🔄"
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleLessonCardClick = (toolName?: string) => {
        if (toolName) {
            const matchedTool = CURATED_TOOLS.find(t =>
                t.name.toLowerCase().includes(toolName) ||
                t.domain.toLowerCase().includes(toolName)
            );
            if (matchedTool) {
                onSelectTool(matchedTool);
                return;
            }
        }
        const quickLesson: LessonData = {
            id: `chat-lesson-${Date.now()}`,
            title: toolName ? `Master ${toolName.charAt(0).toUpperCase() + toolName.slice(1)} in 3 Steps` : 'AI Power User Techniques',
            category: 'General',
            duration: '3 min',
            xp: 50,
            difficulty: 2,
            preview: toolName
                ? `Learn the prompting techniques that get the best results from ${toolName}. Includes copy-paste ready prompts.`
                : 'Three techniques that work across every AI tool to dramatically improve output quality.',
            pill: 'QUICK LESSON',
            steps: [
                toolName
                    ? `Role prompting: The single most effective technique for ${toolName}. Instead of asking a bare question, set the context: "You are a senior [role] with 10 years of experience in [field]. I need help with [task]." This adjusts the vocabulary, depth, and assumptions of every response. Try it: ask the same question with and without a role — the difference is dramatic.`
                    : 'Role prompting works across every AI tool. Start any prompt with: "You are a senior [role] with expertise in [field]." This single line changes vocabulary, depth, and quality. A "senior data scientist" gives technical, precise answers. A "patient teacher" gives beginner-friendly explanations. Always set context first.',
                toolName
                    ? `Structured output: Don't accept whatever format ${toolName} gives you. TELL it the format you want: "Present this as a numbered list with exactly 5 items. Each item should have a bold title and 1-2 sentence explanation. Keep the total under 300 words." The more specific your format requirements, the more usable the output.`
                    : 'Structured output: Never accept default formatting. Specify exactly what you want: "Give me a table with 3 columns: Technique, Example, When to Use. Include 5 rows. Keep each cell under 20 words." Or: "Present this as a numbered list with bold headers." Specific format = usable output.',
                toolName
                    ? `Iteration chains: Never accept the first output. After getting a response from ${toolName}, follow up: "Good, but (1) make it more concise, (2) add a specific example for point 3, (3) rewrite the conclusion as a question." Each refinement compounds — by the 3rd iteration, you have something genuinely excellent. This is the technique that separates power users from casual ones.`
                    : 'Iteration chains: The biggest mistake is accepting the first response. Always follow up: "Improve this by (1) cutting the length in half, (2) adding a real-world example, (3) making the tone more conversational." Each follow-up inherits context and refines quality. Power users iterate 2-3 times on every important output.',
            ],
            practiceTask: toolName
                ? `Take a real task you need to do today and complete it using ${toolName} with all 3 techniques: set a role, specify the output format, and iterate at least twice`
                : 'Take your most recent AI interaction and redo it using all 3 techniques: role, structured output, and 2 rounds of iteration. Compare the final result to what you originally got.',
        };
        onStartLesson(quickLesson);
    };

    return (
        <View style={styles.container}>
            {/* Status bar */}
            <View style={{ height: 44 }} />

            {/* Chat Header */}
            <View style={styles.header}>
                <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>△</Text>
                </View>
                <View>
                    <Text style={styles.headerName}>Delta AI</Text>
                    <View style={styles.onlineRow}>
                        <View style={styles.onlineDot} />
                        <Text style={styles.onlineText}>Online · AI-powered</Text>
                    </View>
                </View>
            </View>

            {/* Chat Thread */}
            <ScrollView
                ref={scrollRef}
                style={styles.chatThread}
                contentContainerStyle={styles.chatThreadContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Suggested prompts (only if fresh) */}
                {messages.length <= 2 && (
                    <View style={styles.suggestedRow}>
                        {SUGGESTED_PROMPTS.map((prompt) => (
                            <TouchableOpacity
                                key={prompt}
                                onPress={() => setInput(prompt)}
                                style={styles.suggestedChip}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.suggestedText}>{prompt}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {messages.map((msg) => (
                    <View key={msg.id}>
                        <View style={[
                            styles.msgWrapper,
                            msg.role === 'user' ? styles.msgWrapperUser : styles.msgWrapperAi,
                        ]}>
                            <View style={[
                                styles.bubble,
                                msg.role === 'user' ? styles.bubbleUser : styles.bubbleAi,
                            ]}>
                                <Text style={[
                                    styles.bubbleText,
                                    msg.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextAi,
                                ]}>
                                    {msg.text}
                                </Text>
                            </View>
                        </View>

                        {/* Inline Lesson Card */}
                        {msg.lessonCard && (
                            <TouchableOpacity
                                onPress={() => handleLessonCardClick(msg.lessonCard?.toolName)}
                                style={styles.lessonCard}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.lessonCardTitle}>{msg.lessonCard.title}</Text>
                                <View style={styles.lessonCardMeta}>
                                    <View style={styles.lessonCardMetaItem}>
                                        <Clock size={12} color={colors.text3} />
                                        <Text style={styles.lessonCardDuration}>{msg.lessonCard.duration}</Text>
                                    </View>
                                    <Text style={styles.lessonCardXp}>+{msg.lessonCard.xp} XP</Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => handleLessonCardClick(msg.lessonCard?.toolName)}
                                    style={styles.lessonCardBtn}
                                    activeOpacity={0.8}
                                >
                                    <Play size={12} color="#fff" fill="#fff" />
                                    <Text style={styles.lessonCardBtnText}>Start Lesson</Text>
                                </TouchableOpacity>
                            </TouchableOpacity>
                        )}
                    </View>
                ))}

                {/* Typing indicator */}
                {isTyping && (
                    <View style={styles.typingIndicator}>
                        <View style={[styles.typingDot, { opacity: 1 }]} />
                        <View style={[styles.typingDot, { opacity: 0.7 }]} />
                        <View style={[styles.typingDot, { opacity: 0.4 }]} />
                    </View>
                )}
            </ScrollView>

            {/* Input Row */}
            <View style={styles.inputRow}>
                <TextInput
                    value={input}
                    onChangeText={setInput}
                    onSubmitEditing={handleSend}
                    placeholder="Ask Delta anything..."
                    placeholderTextColor={colors.text3}
                    style={styles.input}
                    returnKeyType="send"
                />
                <TouchableOpacity
                    onPress={handleSend}
                    disabled={isTyping}
                    style={[styles.sendBtn, isTyping && styles.sendBtnDisabled]}
                    activeOpacity={0.8}
                >
                    <Send size={16} color="#fff" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bg,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    avatarCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    avatarText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    headerName: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text1,
    },
    onlineRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    onlineDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.green,
    },
    onlineText: {
        fontSize: 11,
        color: colors.green,
    },
    chatThread: {
        flex: 1,
    },
    chatThreadContent: {
        padding: 16,
        paddingHorizontal: 20,
        gap: 12,
    },
    suggestedRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 8,
    },
    suggestedChip: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border2,
        backgroundColor: colors.surface2,
    },
    suggestedText: {
        fontSize: 12,
        color: colors.text2,
    },
    msgWrapper: {
        marginBottom: 4,
    },
    msgWrapperUser: {
        alignItems: 'flex-end',
    },
    msgWrapperAi: {
        alignItems: 'flex-start',
    },
    bubble: {
        maxWidth: '80%',
        paddingVertical: 10,
        paddingHorizontal: 14,
    },
    bubbleUser: {
        backgroundColor: colors.accent,
        borderRadius: 18,
        borderBottomRightRadius: 4,
    },
    bubbleAi: {
        backgroundColor: colors.surface2,
        borderRadius: 18,
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: colors.border2,
    },
    bubbleText: {
        fontSize: 13,
        lineHeight: 19.5,
    },
    bubbleTextUser: {
        color: '#fff',
    },
    bubbleTextAi: {
        color: colors.text1,
    },
    lessonCard: {
        maxWidth: '85%',
        marginTop: 8,
        marginBottom: 4,
        backgroundColor: colors.accentBg,
        borderWidth: 1,
        borderColor: 'rgba(99,102,241,0.2)',
        borderRadius: 20,
        padding: 14,
    },
    lessonCardTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text1,
        marginBottom: 6,
    },
    lessonCardMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 10,
    },
    lessonCardMetaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    lessonCardDuration: {
        fontSize: 11,
        color: colors.text3,
    },
    lessonCardXp: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.yellow,
    },
    lessonCardBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.accent,
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 14,
        alignSelf: 'flex-start',
    },
    lessonCardBtnText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    typingIndicator: {
        flexDirection: 'row',
        gap: 4,
        paddingVertical: 10,
        paddingHorizontal: 14,
        backgroundColor: colors.surface2,
        borderWidth: 1,
        borderColor: colors.border2,
        borderRadius: 18,
        borderBottomLeftRadius: 4,
        alignSelf: 'flex-start',
    },
    typingDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.accent2,
    },
    inputRow: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 96,
        flexDirection: 'row',
        gap: 10,
        alignItems: 'center',
    },
    input: {
        flex: 1,
        height: 44,
        backgroundColor: colors.surface2,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.full,
        paddingHorizontal: 16,
        fontSize: 13,
        color: colors.text1,
    },
    sendBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    sendBtnDisabled: {
        backgroundColor: colors.surface3,
    },
});
