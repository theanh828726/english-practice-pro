import React, { useState, useEffect, useCallback } from 'react';
import { CEFRLevel, VocabularyWord } from '../types';
import { fetchCefrVocabulary } from '../services/geminiService';

const SpeakerIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 3.167A7.833 7.833 0 002.167 11c0 2.942 1.606 5.5 3.958 6.833l.25.139V11a.833.833 0 01.833-.833h1.667v6.528A7.833 7.833 0 0010 18.833a7.833 7.833 0 007.833-7.833A7.833 7.833 0 0010 3.167zM11.667 11V4.5a.833.833 0 111.666 0V11a.833.833 0 11-1.666 0z" />
    </svg>
);

const MicrophoneIcon = () => (
     <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8h-1a6 6 0 11-12 0H3a7.001 7.001 0 006 6.93V17H7a1 1 0 100 2h6a1 1 0 100-2h-2v-2.07z" clipRule="evenodd" />
    </svg>
);

const Pronunciation: React.FC<{ speechRate: number; selectedVoice: string, speechLang: string }> = ({ speechRate, selectedVoice, speechLang }) => {
    const [level, setLevel] = useState<CEFRLevel>('A1');
    const [wordPool, setWordPool] = useState<VocabularyWord[]>([]);
    const [currentWordIndex, setCurrentWordIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [userTranscript, setUserTranscript] = useState<string | null>(null);
    const [pronunciationScore, setPronunciationScore] = useState<number | null>(null);
    const [error, setError] = useState('');

    const loadWordPool = useCallback(async () => {
        setIsLoading(true);
        setError('');
        setUserTranscript(null);
        setPronunciationScore(null);
        try {
            const words = await fetchCefrVocabulary(level, 1, 50);
            if (words.length === 0) {
                 setError('Không tìm thấy từ vựng cho cấp độ này.');
                 setWordPool([]);
            } else {
                const shuffledWords = [...words].sort(() => 0.5 - Math.random());
                setWordPool(shuffledWords);
                setCurrentWordIndex(0);
            }
        } catch (err) {
            setError('Không thể tải từ vựng. Vui lòng thử lại.');
        } finally {
            setIsLoading(false);
        }
    }, [level]);

    useEffect(() => {
        loadWordPool();
    }, [loadWordPool]);

    const currentWord = wordPool.length > 0 ? wordPool[currentWordIndex] : null;

    const handleNextWord = () => {
        setUserTranscript(null);
        setPronunciationScore(null);
        if (currentWordIndex < wordPool.length - 1) {
            setCurrentWordIndex(prev => prev + 1);
        } else {
            loadWordPool();
        }
    };
    
     const handleLevelChange = (newLevel: CEFRLevel) => {
        setLevel(newLevel);
        setWordPool([]);
        setCurrentWordIndex(0);
    };

    const playAudio = (text: string) => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        // FIX: Use speechLang prop for consistent language selection.
        utterance.lang = speechLang === 'en' ? 'en-US' : 'vi-VN';
        utterance.rate = speechRate;
        if (selectedVoice) {
            const voice = window.speechSynthesis.getVoices().find(v => v.name === selectedVoice);
            if (voice) utterance.voice = voice;
        }
        window.speechSynthesis.speak(utterance);
    };

    // Simple similarity score (Levenshtein distance based)
    const calculateScore = (target: string, transcript: string) => {
        const s1 = target.toLowerCase().replace(/[^a-z0-9\s]/g, '');
        const s2 = transcript.toLowerCase().replace(/[^a-z0-9\s]/g, '');
        const longer = s1.length > s2.length ? s1 : s2;
        const shorter = s1.length > s2.length ? s2 : s1;
        if (longer.length === 0) return 100;

        const costs = new Array(shorter.length + 1);
        for (let i = 0; i <= shorter.length; i++) {
            let lastValue = i;
            for (let j = 0; j <= longer.length; j++) {
                if (i === 0) costs[j] = j;
                else {
                    if (j > 0) {
                        let newValue = costs[j - 1];
                        if (shorter.charAt(i - 1) !== longer.charAt(j - 1))
                            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                        costs[j - 1] = lastValue;
                        lastValue = newValue;
                    }
                }
            }
            if (i > 0) costs[longer.length] = lastValue;
        }
        const distance = costs[longer.length];
        return Math.round(((longer.length - distance) / longer.length) * 100);
    };


    const handlePractice = () => {
        if (!currentWord) return;

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setError('Trình duyệt của bạn không hỗ trợ nhận dạng giọng nói.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        setIsRecording(true);
        setUserTranscript(null);
        setPronunciationScore(null);
        setError('');

        recognition.start();

        recognition.onresult = (event: any) => {
            const spokenText = event.results[0][0].transcript;
            setUserTranscript(spokenText);
            const score = calculateScore(currentWord.word, spokenText);
            setPronunciationScore(score);
        };

        recognition.onspeechend = () => recognition.stop();
        recognition.onend = () => setIsRecording(false);

        recognition.onerror = (event: any) => {
            if (event.error !== 'no-speech') {
              console.error('Speech recognition error', event.error);
              setError('Lỗi nhận dạng giọng nói. Hãy thử lại.');
            }
            setIsRecording(false);
        };
    };

    const LoadingSkeleton = () => (
        <div className="text-center p-10 bg-light-card dark:bg-dark-card rounded-lg shadow-lg animate-pulse">
            <div className="h-16 bg-gray-300 dark:bg-gray-600 rounded w-1/2 mx-auto mb-4"></div>
            <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-1/3 mx-auto mb-6"></div>
            <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-1/4 mx-auto"></div>
        </div>
    );

    return (
        <div>
            <h2 className="text-3xl font-bold mb-6 text-primary">Luyện phát âm</h2>
            <div className="flex justify-center flex-wrap gap-2 mb-6">
                {(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as CEFRLevel[]).map(l => (
                    <button
                        key={l}
                        onClick={() => handleLevelChange(l as CEFRLevel)}
                        className={`px-4 py-2 rounded-md font-semibold transition-all ${
                            level === l ? 'bg-primary text-white shadow-md' : 'bg-light-card dark:bg-dark-card hover:bg-primary/10'
                        }`}
                    >
                        {l}
                    </button>
                ))}
            </div>

            <div className="max-w-2xl mx-auto">
                {isLoading ? <LoadingSkeleton /> :
                 error && !currentWord ? <div className="text-center text-red-500 bg-red-100 p-4 rounded-lg">{error}</div> :
                 currentWord ? (
                    <div className="text-center p-10 bg-light-card dark:bg-dark-card rounded-lg shadow-lg">
                        <p className="text-7xl font-bold mb-3">{currentWord.word}</p>
                        <p className="text-2xl text-gray-500 dark:text-gray-400 mb-4">/{currentWord.ipa}/</p>
                        <p className="text-xl font-semibold text-accent">"{currentWord.meaning_vi}"</p>
                    </div>
                ) : null}

                <div className="mt-8 flex items-center justify-center gap-6">
                    <button
                        onClick={() => currentWord && playAudio(currentWord.word)}
                        disabled={!currentWord || isRecording}
                        className="p-4 rounded-full bg-accent text-white shadow-lg hover:bg-emerald-600 transition disabled:opacity-50"
                        aria-label="Nghe phát âm mẫu"
                    >
                        <SpeakerIcon />
                    </button>
                    <button
                        onClick={handlePractice}
                        disabled={!currentWord || isRecording}
                        className={`p-6 rounded-full text-white shadow-lg transition disabled:opacity-50 ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-primary hover:bg-blue-700'}`}
                        aria-label="Bắt đầu luyện nói"
                    >
                        <MicrophoneIcon />
                    </button>
                    <button
                        onClick={handleNextWord}
                        disabled={isLoading || isRecording}
                        className="px-6 py-3 bg-gray-200 dark:bg-gray-600 font-semibold rounded-lg shadow hover:bg-gray-300 dark:hover:bg-gray-500 transition disabled:opacity-50"
                    >
                        Từ tiếp theo
                    </button>
                </div>
                
                {error && <p className="text-red-500 text-center mt-4">{error}</p>}
                
                {pronunciationScore !== null && (
                    <div className="mt-8 text-center p-6 bg-light-bg dark:bg-dark-bg rounded-lg">
                        <p className="text-lg">Bạn đã nói: <span className="font-semibold text-primary">{userTranscript}</span></p>
                        <p className="text-3xl font-bold mt-2">
                            Điểm: <span className={pronunciationScore >= 70 ? 'text-green-500' : 'text-orange-500'}>{pronunciationScore} / 100</span>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Pronunciation;
