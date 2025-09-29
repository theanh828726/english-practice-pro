import React, { useState, useEffect } from 'react';
import { ConversationLine, CEFRLevel, ActiveView } from '../types';
import { fetchConversation, fetchMoreConversationLines } from '../services/geminiService';
import { addHistoryItem } from '../services/historyService';

const SpeakerIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 3.167A7.833 7.833 0 002.167 11c0 2.942 1.606 5.5 3.958 6.833l.25.139V11a.833.833 0 01.833-.833h1.667v6.528A7.833 7.833 0 0010 18.833a7.833 7.833 0 007.833-7.833A7.833 7.833 0 0010 3.167zM11.667 11V4.5a.833.833 0 111.666 0V11a.833.833 0 11-1.666 0z" />
    </svg>
);

const MicrophoneIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8h-1a6 6 0 11-12 0H3a7.001 7.001 0 006 6.93V17H7a1 1 0 100 2h6a1 1 0 100-2h-2v-2.07z" clipRule="evenodd" />
    </svg>
);


const Conversations: React.FC<{ speechRate: number; selectedVoice: string, speechLang: string }> = ({ speechRate, selectedVoice, speechLang }) => {
    const [level, setLevel] = useState<CEFRLevel>('A1');
    const [conversation, setConversation] = useState<ConversationLine[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [isRecording, setIsRecording] = useState<number | null>(null); // turn number
    const [practiceResult, setPracticeResult] = useState<{ turn: number, score: number } | null>(null);
    const [customTopic, setCustomTopic] = useState('');
    const [recognitionLang, setRecognitionLang] = useState('vi-VN');
    const [isListening, setIsListening] = useState(false);
    const [recognitionError, setRecognitionError] = useState('');

    useEffect(() => {
        const loadConversation = async () => {
            setIsLoading(true);
            setConversation([]);
            const data = await fetchConversation(level);
            setConversation(data);
            if (data.length > 0) {
                addHistoryItem(ActiveView.Conversations, `Hội thoại CEFR ${level}: ${data[0].topic}`, data);
            }
            setIsLoading(false);
        };
        loadConversation();
    }, [level]);

    const playAudio = (text: string, lang: 'en' | 'vi') => {
        window.speechSynthesis.cancel(); 
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang === 'en' ? 'en-US' : 'vi-VN';
        utterance.rate = speechRate;
        if (selectedVoice) {
            const voice = window.speechSynthesis.getVoices().find(v => v.name === selectedVoice);
            if (voice) {
                utterance.voice = voice;
            }
        }
        window.speechSynthesis.speak(utterance);
    };

    const practiceSpeaking = (line: ConversationLine) => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('Trình duyệt của bạn không hỗ trợ nhận dạng giọng nói.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        setIsRecording(line.turn);
        setPracticeResult(null);

        recognition.start();

        recognition.onresult = (event: any) => {
            const spokenText = event.results[0][0].transcript;
            
            const calculateSimilarity = (s1: string, s2: string): number => {
                let longer = s1;
                let shorter = s2;
                if (s1.length < s2.length) {
                    longer = s2;
                    shorter = s1;
                }
                const longerLength = longer.length;
                if (longerLength === 0) {
                    return 1.0;
                }
                const editDistance = (str1: string, str2: string) => {
                    const costs = [];
                    for (let i = 0; i <= str1.length; i++) {
                        let lastValue = i;
                        for (let j = 0; j <= str2.length; j++) {
                            if (i === 0) {
                                costs[j] = j;
                            } else {
                                if (j > 0) {
                                    let newValue = costs[j - 1];
                                    if (str1.charAt(i - 1) !== str2.charAt(j - 1)) {
                                        newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                                    }
                                    costs[j - 1] = lastValue;
                                    lastValue = newValue;
                                }
                            }
                        }
                        if (i > 0) costs[str2.length] = lastValue;
                    }
                    return costs[str2.length];
                };
                return (longerLength - editDistance(longer, shorter)) / longerLength;
            };

            const score = Math.round(calculateSimilarity(line.en.toLowerCase(), spokenText.toLowerCase()) * 100);
            setPracticeResult({ turn: line.turn, score: score });
        };
        
        recognition.onspeechend = () => {
            recognition.stop();
        };

        recognition.onend = () => {
            setIsRecording(null);
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            setIsRecording(null);
        };
    };

    const handleCustomTopicSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!customTopic.trim()) return;
        setIsLoading(true);
        setConversation([]);
        const data = await fetchConversation(level, customTopic.trim());
        setConversation(data);
        if (data.length > 0) {
            addHistoryItem(ActiveView.Conversations, `Hội thoại: ${data[0].topic}`, data);
        }
        setIsLoading(false);
        setCustomTopic('');
    };

    const handleMoreLines = async () => {
        if (conversation.length === 0) return;
        setIsSuggesting(true);
        const moreLines = await fetchMoreConversationLines(conversation, level);
        setConversation(prev => [...prev, ...moreLines]);
        setIsSuggesting(false);
    };
    
    const handleLevelChange = (newLevel: CEFRLevel) => {
        setLevel(newLevel);
        setCustomTopic('');
    };

    return (
        <div>
            <h2 className="text-3xl font-bold mb-6 text-primary">Luyện Hội thoại</h2>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex flex-wrap items-center gap-2">
                    {(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as CEFRLevel[]).map(l => (
                        <button
                            key={l}
                            onClick={() => handleLevelChange(l)}
                            className={`px-4 py-2 rounded-md font-semibold transition-all ${
                                level === l ? 'bg-primary text-white shadow-md' : 'bg-light-card dark:bg-dark-card hover:bg-primary/10'
                            }`}
                        >
                            {l}
                        </button>
                    ))}
                </div>
                <form onSubmit={handleCustomTopicSubmit} className="flex-grow flex gap-2">
                    <input
                        type="text"
                        value={customTopic}
                        onChange={(e) => setCustomTopic(e.target.value)}
                        placeholder="Hoặc nhập chủ đề tùy chọn..."
                        className="w-full p-2 border border-light-border dark:border-dark-border rounded-md bg-light-bg dark:bg-dark-bg focus:ring-2 focus:ring-primary"
                    />
                    <button type="submit" disabled={isLoading} className="px-4 py-2 bg-accent text-white font-semibold rounded-md hover:bg-emerald-600 disabled:bg-gray-400">Tạo</button>
                </form>
            </div>

            <div className="bg-light-card dark:bg-dark-card p-6 rounded-lg shadow-lg min-h-[300px]">
                {isLoading ? <p>Đang tạo hội thoại...</p> : conversation.length === 0 ? <p>Chọn cấp độ hoặc nhập chủ đề để bắt đầu.</p> : (
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold mb-2 text-gray-700 dark:text-gray-300">Chủ đề: {conversation[0].topic}</h3>
                        {conversation.map(line => (
                            <div key={line.turn} className={`flex items-start gap-3 p-3 rounded-lg ${line.turn % 2 === 1 ? 'bg-light-bg dark:bg-dark-bg' : ''}`}>
                                <div className={`font-bold text-white rounded-full h-8 w-8 flex-shrink-0 flex items-center justify-center ${line.turn % 2 === 1 ? 'bg-blue-500' : 'bg-pink-500'}`}>
                                    {line.turn % 2 === 1 ? 'A' : 'B'}
                                </div>
                                <div className="flex-grow">
                                    <p className="text-lg text-accent">{line.en}</p>
                                    <p className="text-sm italic">"{line.vi}"</p>
                                    {practiceResult && practiceResult.turn === line.turn && (
                                        <p className="text-sm font-semibold">Điểm phát âm: <span className={practiceResult.score > 70 ? 'text-green-500' : 'text-orange-500'}>{practiceResult.score}/100</span></p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => playAudio(line.en, 'en')} className="p-2 rounded-full hover:bg-accent/20 text-accent" title="Nghe"><SpeakerIcon /></button>
                                    <button onClick={() => practiceSpeaking(line)} disabled={isRecording !== null} className={`p-2 rounded-full transition ${isRecording === line.turn ? 'bg-red-500 text-white animate-pulse' : 'hover:bg-primary/20 text-primary'}`} title="Luyện nói"><MicrophoneIcon /></button>
                                </div>
                            </div>
                        ))}
                         <div className="pt-4 text-center">
                            <button onClick={handleMoreLines} disabled={isSuggesting} className="px-5 py-2 bg-gray-200 dark:bg-gray-600 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition disabled:opacity-50">
                                {isSuggesting ? 'Đang viết tiếp...' : 'Xem tiếp hội thoại'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Conversations;
