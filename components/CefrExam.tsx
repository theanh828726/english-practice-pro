import React, { useState } from 'react';
import { CEFRLevel, ExamQuestion, CefrExamResult, ActiveView } from '../types';
import { fetchCefrExam } from '../services/geminiService';
import { addHistoryItem } from '../services/historyService';

// Re-usable icons
const SpeakerIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3.167A7.833 7.833 0 002.167 11c0 2.942 1.606 5.5 3.958 6.833l.25.139V11a.833.833 0 01.833-.833h1.667v6.528A7.833 7.833 0 0010 18.833a7.833 7.833 0 007.833-7.833A7.833 7.833 0 0010 3.167zM11.667 11V4.5a.833.833 0 111.666 0V11a.833.833 0 11-1.666 0z" /></svg>
);
const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1 text-green-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
);
const XIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1 text-red-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
);

const CefrExam: React.FC<{ speechRate: number; selectedVoice: string }> = ({ speechRate, selectedVoice }) => {
    const [level, setLevel] = useState<CEFRLevel>('A1');
    const [questions, setQuestions] = useState<ExamQuestion[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<(string | null)[]>([]);
    const [examState, setExamState] = useState<'setup' | 'playing' | 'finished'>('setup');
    const [isLoading, setIsLoading] = useState(false);

    const startExam = async () => {
        setIsLoading(true);
        try {
            const fetchedQuestions = await fetchCefrExam(level);
            if (fetchedQuestions && fetchedQuestions.length > 0) {
                setQuestions(fetchedQuestions);
                setExamState('playing');
                setCurrentQuestionIndex(0);
                setUserAnswers(new Array(fetchedQuestions.length).fill(null));
            } else {
                alert('Không thể tải đề thi. Vui lòng thử lại.');
            }
        } catch (error) {
            console.error("Failed to fetch exam:", error);
            alert("Đã xảy ra lỗi khi tải đề thi. Vui lòng thử lại.");
        } finally {
            setIsLoading(false);
        }
    };

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

    const handleAnswer = (answer: string) => {
        const newAnswers = [...userAnswers];
        newAnswers[currentQuestionIndex] = answer;
        setUserAnswers(newAnswers);

        // Automatically move to the next question
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(i => i + 1);
        } else {
            finishExam(newAnswers);
        }
    };

    const finishExam = (finalAnswers: (string | null)[]) => {
        let score = 0;
        questions.forEach((q, index) => {
            if (q.correct_answer === finalAnswers[index]) {
                score++;
            }
        });

        const examResult: CefrExamResult = {
            level,
            score,
            totalQuestions: questions.length,
            questions,
            userAnswers: finalAnswers,
        };
        addHistoryItem(ActiveView.CefrExam, `Bài thi CEFR ${level}: Đạt ${score}/${questions.length}`, examResult);
        setExamState('finished');
    };

    const resetExam = () => {
        setExamState('setup');
        setQuestions([]);
    };
    
    const score = questions.reduce((acc, q, index) => acc + (q.correct_answer === userAnswers[index] ? 1 : 0), 0);

    const renderCurrentQuestion = () => {
        if (examState !== 'playing' || !questions.length) return null;
        const q = questions[currentQuestionIndex];
        return (
            <div>
                <div className="mb-4 text-center">
                    <span className="font-bold text-lg text-primary">{q.section}</span>
                </div>
                {q.audio_script && (
                    <div className="text-center mb-4 p-3 bg-light-bg dark:bg-dark-bg rounded-lg flex items-center justify-center gap-4">
                        <p className="italic">Nghe đoạn hội thoại/thông tin và trả lời câu hỏi.</p>
                        <button onClick={() => playAudio(q.audio_script)} className="p-2 bg-accent text-white rounded-full hover:bg-emerald-600 transition">
                            <SpeakerIcon />
                        </button>
                    </div>
                )}
                <p className="text-xl mb-6 whitespace-pre-wrap">{q.question_text}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {q.options.map((option, index) => (
                        <button 
                            key={index} 
                            onClick={() => handleAnswer(option)}
                            className="p-4 bg-light-card dark:bg-dark-card rounded-lg shadow hover:bg-primary/20 transition text-lg text-left"
                        >
                           <span className="font-bold mr-2">{String.fromCharCode(65 + index)}.</span> {option}
                        </button>
                    ))}
                </div>
            </div>
        );
    };
    
    if (examState === 'setup') {
        return (
            <div className="text-center p-8 bg-light-card dark:bg-dark-card rounded-lg">
                <h2 className="text-3xl font-bold mb-6 text-primary">Thi Thử CEFR</h2>
                <h3 className="text-xl font-semibold mb-4">Chọn cấp độ để bắt đầu</h3>
                <div className="flex justify-center flex-wrap gap-2 mb-6">
                    {(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as CEFRLevel[]).map(l => (
                        <button key={l} onClick={() => setLevel(l)} className={`px-4 py-2 rounded-full font-semibold transition-all text-lg ${level === l ? 'bg-primary text-white scale-110' : 'bg-light-bg dark:bg-dark-bg'}`}>
                            {l}
                        </button>
                    ))}
                </div>
                <button onClick={startExam} disabled={isLoading} className="px-8 py-3 bg-accent text-white font-bold rounded-lg text-xl hover:bg-emerald-600 transition disabled:bg-gray-400">
                    {isLoading ? 'Đang tải đề...' : 'Bắt đầu thi'}
                </button>
            </div>
        );
    }
    
    if (examState === 'playing') {
        return (
             <div className="p-4 sm:p-8 bg-light-card dark:bg-dark-card rounded-lg shadow-xl max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-primary">CEFR Level {level}</h2>
                    <p className="font-semibold">Câu hỏi: {currentQuestionIndex + 1} / {questions.length}</p>
                </div>
                <div className="w-full bg-light-border dark:bg-dark-border rounded-full h-2.5 mb-6">
                    <div className="bg-accent h-2.5 rounded-full" style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}></div>
                </div>
                {renderCurrentQuestion()}
            </div>
        );
    }
    
    if (examState === 'finished') {
        return (
             <div className="text-center p-8 bg-light-card dark:bg-dark-card rounded-lg max-w-4xl mx-auto">
                <h3 className="text-2xl font-bold">Hoàn thành bài thi!</h3>
                <p className="text-5xl my-4">Điểm: <span className="text-accent font-bold">{score} / {questions.length}</span></p>
                <div className="my-8 text-left">
                  <h4 className="font-bold text-xl mb-4 text-center">Xem lại các câu trả lời sai:</h4>
                  <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                    {questions.map((q, i) => userAnswers[i] !== q.correct_answer && (
                       <div key={i} className="p-4 bg-light-bg dark:bg-dark-bg rounded-lg border-l-4 border-red-500">
                           <p className="font-semibold">{i + 1}. {q.question_text}</p>
                           <p className="text-sm mt-2"><XIcon />Bạn đã chọn: <span className="text-red-500">{userAnswers[i] || 'Không trả lời'}</span></p>
                           <p className="text-sm"><CheckIcon />Đáp án đúng: <span className="text-green-500">{q.correct_answer}</span></p>
                           <p className="text-sm italic mt-1 text-gray-500 dark:text-gray-400">Giải thích: {q.explanation}</p>
                       </div>
                    ))}
                     {score === questions.length && <p className="text-center text-green-500 text-lg">🎉 Chúc mừng! Bạn đã trả lời đúng tất cả các câu hỏi.</p>}
                  </div>
                </div>
                <button onClick={resetExam} className="px-6 py-2 bg-primary text-white font-bold rounded-lg hover:bg-blue-700 transition">
                    Làm bài thi khác
                </button>
            </div>
        );
    }

    return null;
};

export default CefrExam;
