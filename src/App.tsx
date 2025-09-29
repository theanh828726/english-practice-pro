import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import { ActiveView } from './types';

// Import view components
import Translator from './components/Translator';
import Dictionary from './components/Dictionary';
import Vocabulary from './components/Vocabulary';
import Conversations from './components/Conversations';
import GrammarPractice from './components/GrammarPractice';
import Flashcards from './components/Flashcards';
import Quiz from './components/Quiz';
import CefrExam from './components/CefrExam';
import Pronunciation from './components/Pronunciation';
import History from './components/History';
import Settings from './components/Settings';

const App: React.FC = () => {
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
        const speechProps = { speechRate, selectedVoice, speechLang };
        switch (activeView) {
            case ActiveView.Translator:
                return <Translator {...speechProps} />;
            case ActiveView.Dictionary:
                return <Dictionary {...speechProps} />;
            case ActiveView.Vocabulary:
                return <Vocabulary {...speechProps} />;
            case ActiveView.Conversations:
                return <Conversations {...speechProps} />;
            case ActiveView.GrammarPractice:
                return <GrammarPractice />;
            case ActiveView.Flashcards:
                return <Flashcards {...speechProps} />;
            case ActiveView.Quiz:
                return <Quiz />;
            case ActiveView.CefrExam:
                return <CefrExam {...speechProps} />;
            case ActiveView.Pronunciation:
                return <Pronunciation {...speechProps} />;
            case ActiveView.History:
                return <History {...speechProps} />;
            case ActiveView.Settings:
                return <Settings />;
            default:
                return <Translator {...speechProps} />;
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
                        {renderActiveView()}
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