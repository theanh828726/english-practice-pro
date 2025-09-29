import React, { useState, useEffect, Suspense, lazy } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import { ActiveView } from './types';

// Lazy load components for code splitting
const Translator = lazy(() => import('./components/Translator'));
const Dictionary = lazy(() => import('./components/Dictionary'));
const Vocabulary = lazy(() => import('./components/Vocabulary'));
const Conversations = lazy(() => import('./components/Conversations'));
const GrammarPractice = lazy(() => import('./components/GrammarPractice'));
const Flashcards = lazy(() => import('./components/Flashcards'));
const Quiz = lazy(() => import('./components/Quiz'));
const CefrExam = lazy(() => import('./components/CefrExam'));
const Pronunciation = lazy(() => import('./components/Pronunciation'));
const History = lazy(() => import('./components/History'));
const Settings = lazy(() => import('./components/Settings'));

const LoadingFallback = () => (
    <div className="flex items-center justify-center h-full">
        <p className="text-xl animate-pulse">Đang tải tính năng...</p>
    </div>
);

const App: React.FC = () => {
    // API key check
    if (!process.env.API_KEY) {
        return (
            <div className="flex items-center justify-center h-screen bg-red-100 dark:bg-red-900/20">
                <div className="text-center p-8 bg-white dark:bg-dark-card rounded-lg shadow-lg">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">Lỗi Cấu hình API Key</h1>
                    <p className="text-gray-700 dark:text-gray-300">
                        Khóa API của Gemini chưa được thiết lập.
                    </p>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">
                        Vui lòng thiết lập biến môi trường <code className="bg-red-200 dark:bg-red-800 p-1 rounded">API_KEY</code> trong phần cài đặt của Vercel và deploy lại.
                    </p>
                </div>
            </div>
        );
    }
    
    const [activeView, setActiveView] = useState<ActiveView>(ActiveView.Translator);
    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (localStorage.theme === 'dark') {
            return true;
        }
        if (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return true;
        }
        return false;
    });

    // Speech synthesis state
    const [speechRate, setSpeechRate] = useState(1);
    const [speechLang, setSpeechLang] = useState('en');
    const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [selectedVoice, setSelectedVoice] = useState('');

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.theme = 'dark';
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.theme = 'light';
        }
    }, [isDarkMode]);

    useEffect(() => {
        const updateVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            setAvailableVoices(voices);
            if (voices.length > 0 && !selectedVoice) {
                const defaultEnVoice = voices.find(v => v.lang.startsWith('en'));
                if (defaultEnVoice) {
                    setSelectedVoice(defaultEnVoice.name);
                }
            }
        };

        window.speechSynthesis.onvoiceschanged = updateVoices;
        updateVoices();

        return () => {
            window.speechSynthesis.onvoiceschanged = null;
        };
    }, [selectedVoice]);

    const toggleTheme = () => setIsDarkMode(prev => !prev);

    const renderActiveView = () => {
        const fullSpeechProps = { speechRate, selectedVoice, speechLang };
        const limitedSpeechProps = { speechRate, selectedVoice };

        switch (activeView) {
            case ActiveView.Translator:
                return <Translator {...fullSpeechProps} />;
            case ActiveView.Dictionary:
                return <Dictionary {...limitedSpeechProps} />;
            case ActiveView.Vocabulary:
                return <Vocabulary {...limitedSpeechProps} />;
            case ActiveView.Conversations:
                return <Conversations {...limitedSpeechProps} />;
            case ActiveView.GrammarPractice:
                return <GrammarPractice />;
            case ActiveView.Flashcards:
                return <Flashcards {...limitedSpeechProps} />;
            case ActiveView.Quiz:
                return <Quiz />;
            case ActiveView.CefrExam:
                return <CefrExam {...limitedSpeechProps} />;
            case ActiveView.Pronunciation:
                return <Pronunciation {...limitedSpeechProps} />;
            case ActiveView.History:
                return <History {...limitedSpeechProps} />;
            case ActiveView.Settings:
                return <Settings />;
            default:
                return <Translator {...fullSpeechProps} />;
        }
    };

    return (
        <div className={isDarkMode ? 'dark' : ''}>
            <div className="flex h-screen bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text font-sans">
                <Sidebar activeView={activeView} setActiveView={setActiveView} />
                <div className="flex flex-col flex-1">
                    <Header
                        isDarkMode={isDarkMode}
                        toggleTheme={toggleTheme}
                        speechRate={speechRate}
                        setSpeechRate={setSpeechRate}
                        speechLang={speechLang}
                        setSpeechLang={setSpeechLang}
        				availableVoices={availableVoices.filter(v => v.lang.startsWith(speechLang))}
                        selectedVoice={selectedVoice}
                        setVoice={setSelectedVoice}
                    />
                    <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
                        <Suspense fallback={<LoadingFallback />}>
                            {renderActiveView()}
                        </Suspense>
                    </main>
                    <footer className="p-2 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-light-border dark:border-dark-border">
                        <span>
                            được tạo ra bởi Thế Anh - Aivio
                        </span>
                    </footer>
                </div>
            </div>
        </div>
    );
};

export default App;
