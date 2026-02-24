import React, { useState, useEffect } from 'react';
import { LessonData } from '../shared/types/types';
import { storageService } from '../entities/user/storageService';
import { ArrowLeft, CheckCircle, Copy, Clock, Sparkles, ChevronRight, ExternalLink, PlayCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface LessonViewerProps {
    lesson: LessonData;
    onBack: () => void;
}

export function LessonViewer({ lesson, onBack }: LessonViewerProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [completed, setCompleted] = useState(false);
    const [copied, setCopied] = useState(false);

    const [leveledUpTo, setLeveledUpTo] = useState<string | null>(null);

    const steps = lesson.steps || ['Every AI tool has a core mental model — a way of thinking about inputs and outputs. The first step to mastering any tool is understanding what it\'s optimized for and where it falls short.', 'The most impactful technique across all AI tools is structured prompting: Context (who you are) → Task (what you need) → Constraints (format, length, tone). Try this now with any AI tool you have open.', 'Practice makes permanent: take one real task you have today and complete it using the structured prompt approach. Compare the output to what you would have gotten with a vague prompt.'];
    const totalSteps = steps.length;
    const isLastStep = currentStep >= totalSteps - 1;

    const handleComplete = () => {
        // Trigger realistic confetti explosion
        const duration = 3000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval: any = setInterval(function () {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);

        // Award XP via centralized service
        const { user, leveledUp } = storageService.addXP(lesson.xp || 25, lesson.id);

        if (leveledUp) {
            setLeveledUpTo(user.levelTitle);

            // Extra grand confetti for level up
            setTimeout(() => {
                confetti({
                    particleCount: 150,
                    spread: 100,
                    origin: { y: 0.6 },
                    colors: ['#fcd34d', '#f59e0b', '#fff']
                });
            }, 1000);
        }
        setCompleted(true);
    };

    const handleCopyPrompt = () => {
        if (lesson.taskPrompt) {
            navigator.clipboard.writeText(lesson.taskPrompt).catch(() => { });
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (completed) {
        return (
            <div className="screen-container" style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', minHeight: '100%', padding: '40px 20px',
                background: leveledUpTo ? 'linear-gradient(180deg, rgba(251,191,36,0.1) 0%, transparent 100%)' : 'linear-gradient(180deg, rgba(52,211,153,0.1) 0%, transparent 100%)',
            }}>
                <div style={{
                    width: 100, height: 100, borderRadius: '50%',
                    background: leveledUpTo ? 'linear-gradient(135deg, var(--yellow), #fcd34d)' : 'linear-gradient(135deg, var(--green), #2dd4bf)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 32,
                    boxShadow: leveledUpTo ? '0 0 60px rgba(251,191,36,0.4)' : '0 0 60px rgba(52,211,153,0.4)',
                    animation: 'zoomIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    transform: 'scale(1)',
                }}>
                    <CheckCircle size={50} color="#fff" />
                </div>

                {leveledUpTo && (
                    <div style={{
                        fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 800,
                        color: 'var(--yellow)', textTransform: 'uppercase', letterSpacing: '0.2em',
                        marginBottom: 12, animation: 'fadeInUp 0.6s ease',
                        background: 'rgba(251,191,36,0.15)', padding: '6px 16px', borderRadius: 100,
                    }}>LEVEL UP</div>
                )}

                <h2 style={{
                    fontFamily: "'Syne', sans-serif", fontSize: leveledUpTo ? 36 : 28, fontWeight: 800,
                    color: 'var(--text-1)', margin: '0 0 12px', textAlign: 'center',
                    animation: 'fadeInUp 0.7s ease', letterSpacing: '-0.02em',
                }}>{leveledUpTo ? `You are a ${leveledUpTo}!` : 'Lesson Complete!'}</h2>

                <p style={{
                    fontFamily: "'DM Sans', sans-serif", fontSize: 16,
                    color: 'var(--text-2)', textAlign: 'center', marginBottom: 40,
                    animation: 'fadeInUp 0.8s ease', maxWidth: 280, lineHeight: 1.5,
                }}>{lesson.title}</p>

                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 40,
                    animation: 'fadeInUp 0.9s ease',
                    background: 'var(--surface-2)', border: '1px solid var(--border)',
                    padding: '24px 48px', borderRadius: 24, width: '100%', maxWidth: 300,
                }}>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>XP GAINED</span>
                    <span style={{
                        fontFamily: "'Syne', sans-serif", fontSize: 40, fontWeight: 800,
                        color: leveledUpTo ? 'var(--yellow)' : 'var(--green)',
                        textShadow: leveledUpTo ? '0 0 20px rgba(251,191,36,0.3)' : '0 0 20px rgba(52,211,153,0.3)',
                    }}>+{lesson.xp || 25}</span>
                </div>

                <style>
                    {`
                        @keyframes zoomIn {
                            from { opacity: 0; transform: scale(0.5); }
                            to { opacity: 1; transform: scale(1); }
                        }
                    `}
                </style>

                <button onClick={onBack} style={{
                    padding: '16px 36px', width: '100%', maxWidth: 300,
                    background: 'var(--text-1)', color: 'var(--bg)', border: 'none',
                    borderRadius: 16, fontFamily: "'DM Sans', sans-serif",
                    fontSize: 16, fontWeight: 700, cursor: 'pointer',
                    animation: 'fadeInUp 1s ease', transition: 'transform 0.2s ease',
                }}>Back to App</button>
            </div>
        );
    }

    return (
        <div className="screen-container">
            {/* Status bar */}
            <div style={{ height: 44 }} />

            {/* Top bar */}
            <div style={{
                padding: '8px 20px 16px',
                display: 'flex', alignItems: 'center', gap: 12,
            }}>
                <button onClick={onBack} style={{
                    width: 36, height: 36, borderRadius: 12,
                    background: 'var(--surface-2)', border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', flexShrink: 0,
                }}>
                    <ArrowLeft size={18} color="var(--text-2)" />
                </button>
                <div style={{ flex: 1 }}>
                    <div style={{
                        fontFamily: "'DM Sans', sans-serif", fontSize: 10,
                        fontWeight: 700, textTransform: 'uppercase' as const,
                        letterSpacing: '0.12em', color: 'var(--accent-2)',
                    }}>{lesson.pill || 'MICRO-LESSON'}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={12} color="var(--text-3)" />
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'var(--text-3)' }}>
                        {lesson.duration || '2 min'}
                    </span>
                    <span style={{
                        fontFamily: "'DM Sans', sans-serif", fontSize: 11,
                        fontWeight: 700, color: 'var(--yellow)',
                        background: 'rgba(251,191,36,0.15)', padding: '2px 8px',
                        borderRadius: 9999,
                    }}>+{lesson.xp || 25} XP</span>
                </div>
            </div>

            {/* Title */}
            <div style={{ padding: '0 20px 20px' }}>
                <h1 style={{
                    fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800,
                    color: 'var(--text-1)', margin: 0, lineHeight: 1.3,
                }}>{lesson.title}</h1>
                {lesson.preview && (
                    <p style={{
                        fontFamily: "'DM Sans', sans-serif", fontSize: 13,
                        color: 'var(--text-2)', marginTop: 8, lineHeight: 1.6,
                    }}>{lesson.preview}</p>
                )}
            </div>

            {/* Progress bar */}
            <div style={{ padding: '0 20px 20px' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                    {steps.map((_, i) => (
                        <div key={i} style={{
                            flex: 1, height: 4, borderRadius: 100,
                            background: i <= currentStep ? 'var(--accent)' : 'var(--surface-3)',
                            transition: 'background 0.3s ease',
                        }} />
                    ))}
                </div>
                <div style={{
                    fontFamily: "'DM Sans', sans-serif", fontSize: 11,
                    color: 'var(--text-3)', marginTop: 6,
                }}>Step {currentStep + 1} of {totalSteps}</div>
            </div>

            {/* Current Step Content */}
            <div key={`step-${currentStep}`} style={{
                margin: '0 20px 20px', padding: '24px',
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: 24, animation: 'fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
                }}>
                    <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 800,
                        color: '#fff', boxShadow: '0 0 12px rgba(99,102,241,0.5)',
                    }}>{currentStep + 1}</div>
                    <span style={{
                        fontFamily: "'Syne', sans-serif", fontSize: 12,
                        fontWeight: 700, color: 'var(--text-1)',
                        textTransform: 'uppercase' as const, letterSpacing: '0.1em',
                    }}>STEP {currentStep + 1}</span>
                </div>
                <p style={{
                    fontFamily: "'DM Sans', sans-serif", fontSize: 15,
                    color: 'var(--text-1)', lineHeight: 1.6, margin: 0,
                }}>{steps[currentStep]}</p>
            </div>

            {/* Practice Task (show on last step) */}
            {isLastStep && lesson.practiceTask && (
                <div style={{
                    margin: '0 20px 16px', padding: '20px',
                    background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.3)',
                    borderRadius: 20, animation: 'fadeInUp 0.5s ease',
                }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
                    }}>
                        <div style={{ background: 'rgba(52,211,153,0.2)', padding: '6px', borderRadius: '50%' }}>
                            <Sparkles size={16} color="var(--green)" />
                        </div>
                        <span style={{
                            fontFamily: "'Syne', sans-serif", fontSize: 12,
                            fontWeight: 800, color: 'var(--green)',
                            textTransform: 'uppercase' as const, letterSpacing: '0.1em',
                        }}>PRACTICE TASK</span>
                    </div>
                    <p style={{
                        fontFamily: "'DM Sans', sans-serif", fontSize: 14,
                        color: 'var(--text-1)', lineHeight: 1.6, margin: 0,
                    }}>{lesson.practiceTask}</p>
                </div>
            )}

            {/* Copy-Paste Prompt (show on last step) */}
            {isLastStep && lesson.taskPrompt && (
                <div style={{
                    margin: '0 20px 20px', padding: '14px',
                    background: 'var(--surface-3)', border: '1px solid var(--border)',
                    borderRadius: 16,
                }}>
                    <div style={{
                        display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center', marginBottom: 8,
                    }}>
                        <span style={{
                            fontFamily: "'DM Mono', monospace", fontSize: 10,
                            fontWeight: 500, color: 'var(--text-3)',
                            textTransform: 'uppercase' as const, letterSpacing: '0.1em',
                        }}>READY-TO-USE PROMPT</span>
                        <button onClick={handleCopyPrompt} style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontFamily: "'DM Sans', sans-serif", fontSize: 11,
                            color: copied ? 'var(--green)' : 'var(--accent-2)',
                        }}>
                            <Copy size={12} />
                            {copied ? 'Copied!' : 'Copy'}
                        </button>
                    </div>
                    <p style={{
                        fontFamily: "'DM Mono', monospace", fontSize: 12,
                        color: 'var(--text-2)', lineHeight: 1.5,
                        whiteSpace: 'pre-wrap',
                    }}>{lesson.taskPrompt}</p>
                </div>
            )}

            {/* Navigation Buttons */}
            <div style={{
                padding: '0 20px', display: 'flex', gap: 10,
            }}>
                {currentStep > 0 && (
                    <button onClick={() => setCurrentStep(prev => prev - 1)} style={{
                        flex: 1, padding: '12px',
                        background: 'var(--surface-2)', color: 'var(--text-2)',
                        border: '1px solid var(--border)', borderRadius: 14,
                        fontFamily: "'DM Sans', sans-serif", fontSize: 13,
                        fontWeight: 600, cursor: 'pointer',
                    }}>← Previous</button>
                )}
                <button
                    onClick={isLastStep ? handleComplete : () => setCurrentStep(prev => prev + 1)}
                    style={{
                        flex: 1, padding: '12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        background: isLastStep ? 'linear-gradient(135deg, var(--green), #2dd4bf)' : 'var(--accent)',
                        color: '#fff', border: 'none', borderRadius: 14,
                        fontFamily: "'DM Sans', sans-serif", fontSize: 13,
                        fontWeight: 600, cursor: 'pointer',
                    }}
                >
                    {isLastStep ? (
                        <>
                            <CheckCircle size={16} />
                            Complete (+{lesson.xp || 25} XP)
                        </>
                    ) : (
                        <>
                            Next Step
                            <ChevronRight size={16} />
                        </>
                    )}
                </button>
            </div>

            {/* Related Sources */}
            {lesson.sources && lesson.sources.length > 0 && (
                <div style={{ padding: '24px 20px' }}>
                    <SectionLabel>📺 RELATED RESOURCES</SectionLabel>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {lesson.sources.map((source, i) => (
                            <a
                                key={i}
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'flex',
                                    gap: 12,
                                    padding: '12px',
                                    background: 'var(--surface-2)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 16,
                                    textDecoration: 'none',
                                    alignItems: 'center',
                                    transition: 'transform 0.2s ease',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                {source.thumbnail ? (
                                    <div style={{
                                        width: 80, height: 45, borderRadius: 8,
                                        backgroundImage: `url(${source.thumbnail})`,
                                        backgroundSize: 'cover', backgroundPosition: 'center',
                                        position: 'relative', flexShrink: 0,
                                    }}>
                                        <div style={{
                                            position: 'absolute', inset: 0,
                                            background: 'rgba(0,0,0,0.3)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            borderRadius: 8
                                        }}>
                                            <PlayCircle size={20} color="#fff" />
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{
                                        width: 40, height: 40, borderRadius: 10,
                                        background: 'var(--surface-3)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                        <ExternalLink size={18} color="var(--accent-2)" />
                                    </div>
                                )}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontFamily: "'DM Sans', sans-serif", fontSize: 13,
                                        fontWeight: 600, color: 'var(--text-1)',
                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                    }}>{source.title}</div>
                                    <div style={{
                                        fontFamily: "'DM Sans', sans-serif", fontSize: 11,
                                        color: 'var(--text-3)', marginTop: 2
                                    }}>{source.url.includes('youtube.com') ? 'YouTube Video' : 'Reference Link'}</div>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            )}

            <div style={{ height: 40 }} />
        </div>
    );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <div style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 11,
            fontWeight: 800,
            color: 'var(--text-3)',
            letterSpacing: '0.12em',
            margin: '0 0 12px 0',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
        }}>
            {children}
        </div>
    );
}

