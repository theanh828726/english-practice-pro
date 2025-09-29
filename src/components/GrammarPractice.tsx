import React, { useState } from 'react';
import { GrammarCheckResult, ActiveView } from '../types';
import { checkGrammar } from '../services/geminiService';
import { addHistoryItem } from '../services/historyService';

const GrammarPractice: React.FC = () => {
    const [inputText, setInputText] = useState('');
    const [result, setResult] = useState<GrammarCheckResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleCheckGrammar = async () => {
        if (!inputText.trim()) return;

        setIsLoading(true);
        setError('');
        setResult(null);
        try {
            const checkResult = await checkGrammar(inputText);
            setResult(checkResult);
            addHistoryItem(ActiveView.GrammarPractice, `Kiểm tra ngữ pháp: "${inputText.substring(0, 30)}..."`, checkResult);
        } catch (err) {
            setError('Đã xảy ra lỗi khi kiểm tra ngữ pháp. Vui lòng thử lại.');
        } finally {
            setIsLoading(false);
        }
    };

    const LoadingSkeleton = () => (
        <div className="space-y-4 animate-pulse">
            <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-1/3"></div>
            <div className="h-10 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
            <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-1/3 mt-4"></div>
            <div className="h-10 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-6 text-primary">Luyện Ngữ pháp</h2>
            <div className="bg-light-card dark:bg-dark-card p-6 rounded-lg shadow-lg">
                <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Nhập câu Tiếng Anh cần kiểm tra ngữ pháp..."
                    className="w-full h-28 p-3 border border-light-border dark:border-dark-border rounded-md bg-light-bg dark:bg-dark-bg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                />
                <div className="mt-4 flex justify-end">
                    <button
                        onClick={handleCheckGrammar}
                        disabled={isLoading}
                        className="px-6 py-2 bg-primary text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                        {isLoading ? 'Đang kiểm tra...' : 'Kiểm tra'}
                    </button>
                </div>
            </div>

            {error && <p className="mt-4 text-center text-red-500 bg-red-100 dark:bg-red-900/20 p-3 rounded-md">{error}</p>}

            <div className="mt-8">
                {isLoading && <LoadingSkeleton />}
                {result && (
                    <div className="bg-light-card dark:bg-dark-card p-6 rounded-lg shadow-lg">
                        <div className="mb-6">
                            <h4 className="font-semibold text-gray-500 dark:text-gray-400">Câu gốc:</h4>
                            <p className="p-3 bg-light-bg dark:bg-dark-bg rounded-md mt-1 text-gray-700 dark:text-gray-300">{result.original_sentence}</p>
                        </div>

                        {result.errors.length === 0 ? (
                            <div className="text-center p-4 bg-green-100 dark:bg-green-900/20 rounded-md">
                                <p className="font-semibold text-lg text-green-700 dark:text-green-300">🎉 Tuyệt vời! Câu của bạn không có lỗi ngữ pháp.</p>
                            </div>
                        ) : (
                            <div>
                                <div className="mb-6">
                                    <h4 className="font-semibold text-green-600 dark:text-green-400">Câu đã sửa:</h4>
                                    <p className="p-3 bg-green-100 dark:bg-green-900/20 rounded-md mt-1 font-medium text-green-800 dark:text-green-300">{result.corrected_sentence}</p>
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg mb-2">Phân tích lỗi:</h4>
                                    <ul className="space-y-3">
                                        {result.errors.map((error, index) => (
                                            <li key={index} className="p-4 border-l-4 border-red-500 bg-light-bg dark:bg-dark-bg rounded-r-md">
                                                <p className="font-semibold">
                                                    Lỗi: <span className="line-through text-red-500">{error.error_text}</span> → <span className="text-green-500">{error.suggestion}</span>
                                                </p>
                                                <p className="text-sm mt-1 text-gray-600 dark:text-gray-400">
                                                    <span className="font-semibold">Giải thích:</span> {error.explanation}
                                                </p>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default GrammarPractice;