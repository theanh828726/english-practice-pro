import React, { useState } from 'react';
import { CEFRLevel, VocabularyWord } from '../types';
import { fetchCefrVocabulary } from '../services/geminiService';

type QuestionType = 'meaning' | 'word';
interface Question {
    word: VocabularyWord;
    type: QuestionType;
    options: string[];
    correctAnswer: string;
}

const Quiz: React.FC = () => {
    const [level, setLevel] = useState<CEFRLevel>('A1');
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [quizState, setQuizState] = useState<'setup' | 'playing' | 'finished'>('setup');
    const [userAnswers, setUserAnswers] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    const generateQuestions = async () => {
        setIsLoading(true);
        try {
            // Fetch a large pool of words to ensure we have enough for questions and distractors.
            const allLevelWords = await fetchCefrVocabulary(level, 1, 100);
    
            if (allLevelWords.length < 10) {
                alert('Không đủ từ vựng để tạo bài kiểm tra cho cấp độ này. Vui lòng thử lại.');
                setIsLoading(false);
                return;
            }

            // Randomly select 10 words for the questions.
            const wordsForQuestions = allLevelWords.sort(() => 0.5 - Math.random()).slice(0, 10);
    
            const newQuestions: Question[] = wordsForQuestions.map(word => {
                const type: QuestionType = ['meaning', 'word'][Math.floor(Math.random() * 2)] as QuestionType;
                let options: string[] = [];
                let correctAnswer: string = '';
    
                const getDistractors = (correctValue: string, property: 'meaning_vi' | 'word') => {
                    const distractors = allLevelWords
                        .filter(w => w[property] !== correctValue)
                        .sort(() => 0.5 - Math.random())
                        .slice(0, 3)
                        .map(w => w[property] as string);
                    return [...distractors, correctValue].sort(() => 0.5 - Math.random());
                };
    
                switch(type) {
                    case 'meaning': // Show word, guess meaning
                        correctAnswer = word.meaning_vi;
                        options = getDistractors(correctAnswer, 'meaning_vi');
                        break;
                    case 'word': // Show meaning, guess word
                        correctAnswer = word.word;
                        options = getDistractors(correctAnswer, 'word');
                        break;
                }
                return { word, type, options, correctAnswer };
            });
            
            setQuestions(newQuestions);
            setQuizState('playing');
            setCurrentQuestionIndex(0);
            setScore(0);
            setUserAnswers([]);
        } catch (error) {
            console.error("Failed to generate quiz:", error);
            alert("Đã xảy ra lỗi khi tạo bài kiểm tra. Vui lòng thử lại.");
            setQuizState('setup');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleAnswer = (answer: string) => {
        const newAnswers = [...userAnswers, answer];
        setUserAnswers(newAnswers);

        if (answer === questions[currentQuestionIndex].correctAnswer) {
            setScore(s => s + 1);
        }
        
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(i => i + 1);
        } else {
            setQuizState('finished');
        }
    };
    
    const resetQuiz = () => setQuizState('setup');

    const renderQuestion = () => {
        if (quizState !== 'playing' || !questions.length) return null;
        const q = questions[currentQuestionIndex];
        let questionText = '';
        switch(q.type) {
            case 'meaning': questionText = `Nghĩa của "${q.word.word}" là gì?`; break;
            case 'word': questionText = `Từ nào có nghĩa là "${q.word.meaning_vi}"?`; break;
        }

        return (
            <div>
                <p className="text-center text-xl mb-6">{questionText}</p>
                <div className="grid grid-cols-2 gap-4">
                    {q.options.map(option => (
                        <button key={option} onClick={() => handleAnswer(option)} className="p-4 bg-light-card dark:bg-dark-card rounded-lg shadow hover:bg-primary/20 transition text-lg">
                            {option}
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div>
            <h2 className="text-3xl font-bold mb-6 text-primary">Kiểm tra nhanh</h2>
            
            {quizState === 'setup' && (
                <div className="text-center p-8 bg-light-card dark:bg-dark-card rounded-lg">
                    <h3 className="text-xl font-semibold mb-4">Chọn cấp độ để bắt đầu</h3>
                    <div className="flex justify-center flex-wrap gap-2 mb-6">
                        {(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as CEFRLevel[]).map(l => (
                            <button key={l} onClick={() => setLevel(l)} className={`px-4 py-2 rounded-full font-semibold transition-all text-lg ${level === l ? 'bg-primary text-white scale-110' : 'bg-light-bg dark:bg-dark-bg'}`}>
                                {l}
                            </button>
                        ))}
                    </div>
                    <button onClick={generateQuestions} disabled={isLoading} className="px-8 py-3 bg-accent text-white font-bold rounded-lg text-xl hover:bg-emerald-600 transition disabled:bg-gray-400">
                        {isLoading ? 'Đang tạo câu hỏi...' : 'Bắt đầu'}
                    </button>
                </div>
            )}

            {quizState === 'playing' && (
                <div className="p-8 bg-light-card dark:bg-dark-card rounded-lg">
                    <div className="flex justify-between mb-4">
                        <p>Câu hỏi: {currentQuestionIndex + 1} / {questions.length}</p>
                        <p>Điểm: {score}</p>
                    </div>
                    {renderQuestion()}
                </div>
            )}

            {quizState === 'finished' && (
                <div className="text-center p-8 bg-light-card dark:bg-dark-card rounded-lg">
                    <h3 className="text-2xl font-bold">Hoàn thành!</h3>
                    <p className="text-4xl my-4">Điểm của bạn: <span className="text-accent font-bold">{score} / {questions.length}</span></p>
                    <div className="my-6">
                      <h4 className="font-bold mb-2">Gợi ý học tập:</h4>
                      <ul className="text-left max-w-md mx-auto list-disc list-inside">
                        {questions.map((q, i) => userAnswers[i] !== q.correctAnswer && (
                           <li key={i}>Ôn lại từ: <span className="font-semibold text-primary">{q.word.word}</span> (/{q.word.ipa}/) - {q.word.meaning_vi}</li>
                        ))}
                      </ul>
                    </div>
                    <button onClick={resetQuiz} className="px-6 py-2 bg-primary text-white font-bold rounded-lg hover:bg-blue-700 transition">
                        Làm lại
                    </button>
                </div>
            )}
        </div>
    );
};

export default Quiz;