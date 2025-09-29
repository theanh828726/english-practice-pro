// English proficiency levels (CEFR)
export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

// Views in the app
export const ActiveView = {
    Translator: 'Dịch thuật',
    Dictionary: 'Từ điển',
    Vocabulary: 'Từ vựng CEFR',
    Conversations: 'Hội thoại',
    GrammarPractice: 'Luyện Ngữ pháp',
    Flashcards: 'Flashcards',
    Quiz: 'Trắc nghiệm',
    CefrExam: 'Thi CEFR',
    Pronunciation: 'Phát âm',
    History: 'Lịch sử',
    Settings: 'Cài đặt',
} as const;

export type ActiveView = (typeof ActiveView)[keyof typeof ActiveView];

// From geminiService schema for vocabulary
export interface VocabularyWord {
    level: CEFRLevel;
    word: string; // English word
    ipa: string; // IPA transcription
    meaning_vi: string;
    pos: string; // part of speech
    example_en: string;
    example_vi: string;
}

// For flashcards
export interface Flashcard {
    word: VocabularyWord;
    reviewDate: string; // ISO date string
    interval: number;
    easeFactor: number;
}

// From geminiService schema for translation/dictionary
export interface TranslationResult {
    source_lang: string;
    target_lang: string;
    en_translation: string;
    ipa: string;
    vi_translation: string;
    examples: {
        en: string;
        vi: string;
    }[];
    grammar_notes: string[];
}

// From geminiService schema for conversations
export interface ConversationLine {
    topic: string;
    turn: number;
    en: string;
    vi: string;
}

// From geminiService schema for grammar practice
export interface GrammarError {
    error_text: string;
    explanation: string;
    suggestion: string;
}

export interface GrammarCheckResult {
    original_sentence: string;
    corrected_sentence: string;
    errors: GrammarError[];
}


// From geminiService schema for CEFR exam
export type ExamSection = 'Nghe hiểu' | 'Đọc hiểu' | 'Viết';

export interface ExamQuestion {
    section: string;
    question_text: string;
    audio_script: string | null; // Can be null for non-listening sections
    options: string[];
    correct_answer: string;
    explanation: string;
}

// Types for History feature
export interface CefrExamResult {
    level: CEFRLevel;
    score: number;
    totalQuestions: number;
    questions: ExamQuestion[];
    userAnswers: (string | null)[];
}

export type HistoryContent = TranslationResult | ConversationLine[] | CefrExamResult | GrammarCheckResult;

export interface HistoryItem {
    id: string; // unique id
    type: typeof ActiveView.Translator | typeof ActiveView.Dictionary | typeof ActiveView.Conversations | typeof ActiveView.CefrExam | typeof ActiveView.GrammarPractice;
    timestamp: string; // ISO string
    summary: string; // A short summary for display
    content: HistoryContent;
}