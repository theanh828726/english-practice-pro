import React, { useState, useEffect, useCallback } from 'react';
import { Flashcard } from '../types';

const SpeakerIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 3.167A7.833 7.833 0 002.167 11c0 2.942 1.606 5.5 3.958 6.833l.25.139V11a.833.833 0 01.833-.833h1.667v6.528A7.833 7.833 0 0010 18.833a7.833 7.833 0 007.833-7.833A7.833 7.833 0 0010 3.167zM11.667 11V4.5a.833.833 0 111.666 0V11a.833.833 0 11-1.666 0z" />
    </svg>
);


const Flashcards: React.FC<{ speechRate: number; selectedVoice: string }> = ({ speechRate, selectedVoice }) => {
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [dueCards, setDueCards] = useState<Flashcard[]>([]);
    const [sessionInitialDueCards, setSessionInitialDueCards] = useState<Flashcard[]>([]);
    
    const loadDueCards = useCallback(() => {
        const allCards: Flashcard[] = JSON.parse(localStorage.getItem('flashcards') || '[]');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = allCards.filter(card => new Date(card.reviewDate) <= today);
        const shuffledDue = due.sort(() => 0.5 - Math.random());
        setDueCards(shuffledDue);
        setSessionInitialDueCards(shuffledDue); // Store the cards for this session
        setCurrentCardIndex(0);
        setIsFlipped(false);
    }, []);

    useEffect(() => {
        loadDueCards();
    }, [loadDueCards]);

    const handleFlip = () => setIsFlipped(!isFlipped);
    
    const playAudio = (text: string) => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = speechRate;
        if (selectedVoice) {
            const voice = window.speechSynthesis.getVoices().find(v => v.name === selectedVoice);
            if (voice) utterance.voice = voice;
        }
        window.speechSynthesis.speak(utterance);
    };


    const updateCard = (difficulty: 'hard' | 'good' | 'easy') => {
        if (currentCardIndex >= dueCards.length) return;

        const card = dueCards[currentCardIndex];
        let newInterval;
        let newEaseFactor = card.easeFactor;

        switch(difficulty) {
            case 'hard':
                newInterval = 1; // Review again tomorrow
                newEaseFactor = Math.max(1.3, card.easeFactor - 0.2);
                break;
            case 'good':
                newInterval = card.interval * newEaseFactor;
                // easeFactor remains the same
                break;
            case 'easy':
                newInterval = card.interval * newEaseFactor * 1.3; // Give a bonus for easy
                newEaseFactor = card.easeFactor + 0.15;
                break;
        }

        const newReviewDate = new Date();
        newReviewDate.setDate(newReviewDate.getDate() + Math.round(newInterval));
        
        const updatedCard: Flashcard = { ...card, interval: newInterval, easeFactor: newEaseFactor, reviewDate: newReviewDate.toISOString() };

        // Update in localStorage
        const allCards: Flashcard[] = JSON.parse(localStorage.getItem('flashcards') || '[]');
        const cardIndexInAll = allCards.findIndex(c => c.word.word === card.word.word);
        if (cardIndexInAll !== -1) {
            allCards[cardIndexInAll] = updatedCard;
            localStorage.setItem('flashcards', JSON.stringify(allCards));
        }

        // Move to next card
        setIsFlipped(false);
        setCurrentCardIndex(prev => prev + 1);
    };

    const handleCheckAgain = () => {
        if (sessionInitialDueCards.length > 0) {
            // If there were cards this session, restart the review of those cards.
            setDueCards([...sessionInitialDueCards].sort(() => 0.5 - Math.random()));
            setCurrentCardIndex(0);
            setIsFlipped(false);
        } else {
            // If there were no cards to begin with, just check again from localStorage.
            loadDueCards();
        }
    };

    const currentCard = dueCards.length > 0 && currentCardIndex < dueCards.length ? dueCards[currentCardIndex] : null;

    return (
        <div>
            <h2 className="text-3xl font-bold mb-6 text-primary">Flashcards ôn tập</h2>
            <div className="max-w-xl mx-auto">
                <div className="mb-4">
                  <p>{dueCards.length > 0 ? `Cần ôn: ${dueCards.length} thẻ (${currentCardIndex} / ${dueCards.length})` : 'Bạn đã ôn hết thẻ cho hôm nay!'}</p>
                  <div className="w-full bg-light-border dark:bg-dark-border rounded-full h-2.5 mt-2">
                    <div className="bg-accent h-2.5 rounded-full" style={{ width: `${dueCards.length > 0 ? (currentCardIndex / dueCards.length) * 100 : 100}%` }}></div>
                  </div>
                </div>

                {currentCard ? (
                    <div>
                        <div 
                            className="w-full h-64 p-6 rounded-lg shadow-2xl flex items-center justify-center cursor-pointer bg-light-card dark:bg-dark-card"
                            onClick={handleFlip}
                            style={{ perspective: '1000px' }}
                        >
                            <div className={`relative w-full h-full transition-transform duration-500`} style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : '' }}>
                                {/* Front */}
                                <div className="absolute w-full h-full flex items-center justify-center" style={{ backfaceVisibility: 'hidden' }}>
                                    <p className="text-6xl font-bold">{currentCard.word.word}</p>
                                </div>
                                {/* Back */}
                                <div className="absolute w-full h-full p-4 bg-light-card dark:bg-dark-card rounded-lg flex flex-col items-center justify-center text-center" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                                    <p className="text-2xl text-accent">/{currentCard.word.ipa}/</p>
                                    <p className="text-xl font-semibold mt-2">{currentCard.word.meaning_vi}</p>
                                    <div className="flex items-center space-x-2 mt-4">
                                        <p className="text-sm">{currentCard.word.example_en}</p>
                                         <button onClick={(e) => { e.stopPropagation(); playAudio(currentCard.word.example_en); }} className="p-2 rounded-full hover:bg-accent/20 text-accent flex-shrink-0" title="Nghe ví dụ">
                                            <SpeakerIcon />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {isFlipped && (
                            <div className="mt-6 flex justify-around">
                                <button onClick={() => updateCard('hard')} className="px-6 py-3 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 transition">Khó</button>
                                <button onClick={() => updateCard('good')} className="px-6 py-3 bg-yellow-500 text-white rounded-lg font-bold hover:bg-yellow-600 transition">Vừa</button>
                                <button onClick={() => updateCard('easy')} className="px-6 py-3 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition">Dễ</button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center p-10 bg-light-card dark:bg-dark-card rounded-lg">
                        <p className="text-xl">🎉 Chúc mừng! 🎉</p>
                        <p>Bạn đã hoàn thành tất cả các thẻ cần ôn hôm nay.</p>
                        <button onClick={handleCheckAgain} className="mt-4 px-4 py-2 bg-primary text-white rounded">Kiểm tra lại</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Flashcards;