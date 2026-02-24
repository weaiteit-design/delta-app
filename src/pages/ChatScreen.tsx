import React, { useState, useRef, useEffect } from 'react';
import { deltaService, CURATED_TOOLS } from '../shared/api/deltaService';
import { storageService } from '../entities/user/storageService';
import { ToolData, LessonData } from '../shared/types/types';
import { Send, Play, Clock, BookOpen } from 'lucide-react';

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
    const scrollRef = useRef<HTMLDivElement>(null);
    const lastUserKey = useRef('');

    // Re-initialise chat when user profile changes (e.g., after sign-in or role change)
    useEffect(() => {
        const userKey = `${user.name}|${user.role}|${user.aiLevel}`;
        if (userKey !== lastUserKey.current) {
            deltaService.initChat();
            lastUserKey.current = userKey;
            // Reset messages to fresh welcome if user context changed
            if (lastUserKey.current !== '' && messages.length > 1) {
                setMessages([{
                    id: 'welcome',
                    role: 'ai',
                    text: `Hey ${user.name}! 👋 I'm Delta, your AI learning companion. Ask me anything about AI tools, the latest news, or what to learn next!`,
                }]);
            }
        }
    }, [user.name, user.role, user.aiLevel]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
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
            // Find the matching tool
            const matchedTool = CURATED_TOOLS.find(t =>
                t.name.toLowerCase().includes(toolName) ||
                t.domain.toLowerCase().includes(toolName)
            );
            if (matchedTool) {
                onSelectTool(matchedTool);
                return;
            }
        }
        // Fallback: generate a contextual quick lesson
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
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Status bar */}
            <div style={{ height: 44, flexShrink: 0 }} />

            {/* Chat Header */}
            <div style={{
                padding: '8px 20px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                borderBottom: '1px solid var(--border)',
                flexShrink: 0,
            }}>
                <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}>
                    <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>△</span>
                </div>
                <div>
                    <div style={{
                        fontFamily: "'Syne', sans-serif",
                        fontSize: 16,
                        fontWeight: 700,
                        color: 'var(--text-1)',
                    }}>Delta AI</div>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                    }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />
                        <span style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 11,
                            color: 'var(--green)',
                        }}>Online · AI-powered</span>
                    </div>
                </div>
            </div>

            {/* Chat Thread */}
            <div ref={scrollRef} style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                scrollbarWidth: 'none',
            }}>
                {/* Suggested prompts (only if fresh) */}
                {messages.length <= 2 && (
                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 8,
                        marginBottom: 8,
                    }}>
                        {SUGGESTED_PROMPTS.map((prompt) => (
                            <button
                                key={prompt}
                                onClick={() => { setInput(prompt); }}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: 20,
                                    border: '1px solid var(--border-2)',
                                    background: 'var(--surface-2)',
                                    color: 'var(--text-2)',
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontSize: 12,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                }}
                            >
                                {prompt}
                            </button>
                        ))}
                    </div>
                )}

                {messages.map((msg) => (
                    <div key={msg.id}>
                        <div style={{
                            maxWidth: '80%',
                            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                            marginLeft: msg.role === 'user' ? 'auto' : 0,
                            marginRight: msg.role === 'user' ? 0 : 'auto',
                        }}>
                            <div style={{
                                padding: '10px 14px',
                                borderRadius: 18,
                                borderBottomLeftRadius: msg.role === 'ai' ? 4 : 18,
                                borderBottomRightRadius: msg.role === 'user' ? 4 : 18,
                                background: msg.role === 'user' ? 'var(--accent)' : 'var(--surface-2)',
                                border: msg.role === 'ai' ? '1px solid var(--border-2)' : 'none',
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 13,
                                lineHeight: 1.5,
                                color: msg.role === 'user' ? '#fff' : 'var(--text-1)',
                                whiteSpace: 'pre-wrap',
                            }}>
                                {msg.text}
                            </div>
                        </div>

                        {/* Inline Lesson Card */}
                        {msg.lessonCard && (
                            <div
                                onClick={() => handleLessonCardClick(msg.lessonCard?.toolName)}
                                style={{
                                    maxWidth: '85%',
                                    marginTop: 8,
                                    background: 'rgba(99,102,241,0.08)',
                                    border: '1px solid rgba(99,102,241,0.2)',
                                    borderRadius: 20,
                                    padding: '12px 14px',
                                    cursor: 'pointer',
                                    transition: 'transform 0.15s ease',
                                }}
                            >
                                <div style={{
                                    fontFamily: "'Syne', sans-serif",
                                    fontSize: 14,
                                    fontWeight: 700,
                                    color: 'var(--text-1)',
                                    marginBottom: 6,
                                }}>{msg.lessonCard.title}</div>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    marginBottom: 10,
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <Clock size={12} color="var(--text-3)" />
                                        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'var(--text-3)' }}>
                                            {msg.lessonCard.duration}
                                        </span>
                                    </div>
                                    <span style={{
                                        fontFamily: "'DM Sans', sans-serif",
                                        fontSize: 11,
                                        fontWeight: 700,
                                        color: 'var(--yellow)',
                                    }}>+{msg.lessonCard.xp} XP</span>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleLessonCardClick(msg.lessonCard?.toolName);
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        background: 'var(--accent)',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: 12,
                                        padding: '8px 14px',
                                        fontFamily: "'DM Sans', sans-serif",
                                        fontSize: 12,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                    }}>
                                    <Play size={12} fill="#fff" />
                                    Start Lesson
                                </button>
                            </div>
                        )}
                    </div>
                ))}

                {/* Typing indicator */}
                {isTyping && (
                    <div style={{
                        padding: '10px 14px',
                        borderRadius: 18,
                        borderBottomLeftRadius: 4,
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border-2)',
                        alignSelf: 'flex-start',
                        display: 'flex',
                        gap: 4,
                    }}>
                        <div className="animate-pulse-live" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-2)' }} />
                        <div className="animate-pulse-live" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-2)', animationDelay: '0.2s' }} />
                        <div className="animate-pulse-live" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-2)', animationDelay: '0.4s' }} />
                    </div>
                )}
            </div>

            {/* Input Row */}
            <div style={{
                padding: '10px 20px 96px',
                display: 'flex',
                gap: 10,
                alignItems: 'center',
                flexShrink: 0,
            }}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ask Delta anything..."
                    style={{
                        flex: 1,
                        height: 44,
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        borderRadius: 9999,
                        padding: '0 16px',
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 13,
                        color: 'var(--text-1)',
                        outline: 'none',
                    }}
                />
                <button
                    onClick={handleSend}
                    disabled={isTyping}
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: isTyping ? 'var(--surface-3)' : 'var(--accent)',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: isTyping ? 'not-allowed' : 'pointer',
                        flexShrink: 0,
                    }}
                >
                    <Send size={16} color="#fff" />
                </button>
            </div>
        </div>
    );
}
