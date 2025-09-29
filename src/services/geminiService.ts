import { GoogleGenAI, Type } from "@google/genai";
import { TranslationResult, CEFRLevel, VocabularyWord, ConversationLine, ExamQuestion, GrammarCheckResult } from '../types';

// The user is expected to have the API_KEY in their environment variables.
// As per instructions, do not add any UI or logic to handle the key itself.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

/**
 * Translates text between Vietnamese and English using the Gemini API.
 * @param text The text to translate.
 * @returns A promise that resolves to a detailed translation result.
 */
export const fetchTranslation = async (text: string): Promise<TranslationResult> => {
    const model = 'gemini-2.5-flash';
    const prompt = `Translate the following text into English or Vietnamese, whichever is the opposite of the input language. Provide a detailed analysis including the English text, IPA transcription, Vietnamese meaning, 2-3 example sentences (in both English and Vietnamese), and 1-2 relevant grammar notes. The input text is: "${text}"`;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            source_lang: { type: Type.STRING, description: "Language of the input text (e.g., 'Vietnamese' or 'English')" },
            target_lang: { type: Type.STRING, description: "Language of the translation (e.g., 'English' or 'Vietnamese')" },
            en_translation: { type: Type.STRING, description: "The translated English text." },
            ipa: { type: Type.STRING, description: "The IPA transcription of the English text." },
            vi_translation: { type: Type.STRING, description: "The Vietnamese meaning of the text." },
            examples: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        en: { type: Type.STRING, description: "Example sentence in English." },
                        vi: { type: Type.STRING, description: "Vietnamese translation of the example sentence." },
                    },
                    required: ["en", "vi"],
                }
            },
            grammar_notes: {
                type: Type.ARRAY,
                items: {
                    type: Type.STRING,
                    description: "A grammar note or explanation."
                }
            }
        },
        required: ["source_lang", "target_lang", "en_translation", "ipa", "vi_translation", "examples", "grammar_notes"],
    };

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });

        const jsonText = (response.text ?? '').trim();
        const result = JSON.parse(jsonText);
        return result as TranslationResult;
    } catch (error) {
        console.error("Error fetching translation:", error);
        throw new Error("Failed to fetch translation from Gemini API.");
    }
};

/**
 * Extracts text from an image using Gemini's multimodal capabilities.
 * @param imageData Object containing the image's mimeType and base64 data.
 * @returns A promise that resolves to the extracted text.
 */
export const extractTextFromImage = async (imageData: { mimeType: string; data: string }): Promise<string> => {
    const model = 'gemini-2.5-flash';
    
    const imagePart = {
      inlineData: {
        mimeType: imageData.mimeType,
        data: imageData.data, // base64 encoded string without prefix
      },
    };
    const textPart = {
      text: 'Extract all text content from this image. Output only the extracted text as a single block. Do not add any formatting or commentary.'
    };

    try {
        const response = await ai.models.generateContent({
          model: model,
          contents: { parts: [imagePart, textPart] },
        });

        return response.text ?? '';
    } catch (error) {
        console.error("Error extracting text from image:", error);
        throw new Error("Failed to extract text from image using Gemini API.");
    }
};


/**
 * Fetches a detailed dictionary entry for a single word.
 * @param word The word to look up (Vietnamese or English).
 * @returns A promise that resolves to a detailed dictionary entry.
 */
export const fetchDictionaryEntry = async (word: string): Promise<TranslationResult> => {
    const cacheKey = `dictionary-entry-${word}`;
    try {
        const cachedData = sessionStorage.getItem(cacheKey);
        if (cachedData) {
            console.log("Serving dictionary entry from cache:", cacheKey);
            return JSON.parse(cachedData);
        }
    } catch (e) {
        console.warn("Could not read dictionary entry from sessionStorage", e);
    }
    
    const model = 'gemini-2.5-flash';
    const prompt = `Provide a detailed dictionary entry for the word "${word}". The word can be in either Vietnamese or English. The entry should include the English word, its IPA transcription, detailed Vietnamese meaning(s) including part of speech, 2-3 example sentences (in English and Vietnamese), and any relevant grammar notes or synonyms. Treat it as a dictionary lookup, not a full-sentence translation.`;

    // Reusing the TranslationResult schema as it fits perfectly.
    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            source_lang: { type: Type.STRING, description: "Language of the input word (e.g., 'Vietnamese' or 'English')" },
            target_lang: { type: Type.STRING, description: "Language of the primary lookup (e.g., 'English' or 'Vietnamese')" },
            en_translation: { type: Type.STRING, description: "The English word." },
            ipa: { type: Type.STRING, description: "The IPA transcription of the English word." },
            vi_translation: { type: Type.STRING, description: "The detailed Vietnamese meaning of the word, including part of speech." },
            examples: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        en: { type: Type.STRING, description: "Example sentence in English." },
                        vi: { type: Type.STRING, description: "Vietnamese translation of the example sentence." },
                    },
                    required: ["en", "vi"],
                }
            },
            grammar_notes: {
                type: Type.ARRAY,
                items: {
                    type: Type.STRING,
                    description: "A grammar note, synonym, or explanation."
                }
            }
        },
        required: ["source_lang", "target_lang", "en_translation", "ipa", "vi_translation", "examples", "grammar_notes"],
    };

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });

        const jsonText = (response.text ?? '').trim();
        const result = JSON.parse(jsonText);

        try {
            sessionStorage.setItem(cacheKey, JSON.stringify(result));
        } catch (e) {
            console.warn("Could not write dictionary entry to sessionStorage", e);
        }

        return result as TranslationResult;
    } catch (error) {
        console.error("Error fetching dictionary entry:", error);
        throw new Error("Failed to fetch dictionary entry from Gemini API.");
    }
};


/**
 * Fetches a paginated list of CEFR vocabulary words.
 * @param level The CEFR level.
 * @param page The page number for pagination.
 * @param limit The number of words per page.
 * @returns A promise that resolves to an array of vocabulary words for the requested page.
 */
export const fetchCefrVocabulary = async (level: CEFRLevel, page: number, limit: number = 10): Promise<VocabularyWord[]> => {
    const poolCacheKey = `cefr-vocab-pool-${level}`;
    const POOL_SIZE = 100;

    let wordPool: VocabularyWord[] = [];

    try {
        const cachedData = sessionStorage.getItem(poolCacheKey);
        if (cachedData) {
            wordPool = JSON.parse(cachedData);
        }
    } catch (e) {
        console.warn("Could not read vocabulary pool from sessionStorage", e);
    }

    if (wordPool.length === 0) {
        console.log(`Fetching new vocabulary pool (size: ${POOL_SIZE}) from API for CEFR level: ${level}`);
        const model = 'gemini-2.5-flash';
        const prompt = `Generate a list of ${POOL_SIZE} CEFR level ${level} English vocabulary words. For each word, provide the word, its IPA transcription, Vietnamese meaning, part of speech, and a simple example sentence in English with a Vietnamese translation.`;

        const responseSchema = {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    level: { type: Type.STRING, description: "CEFR level" },
                    word: { type: Type.STRING, description: "The English word." },
                    ipa: { type: Type.STRING, description: "The IPA transcription." },
                    meaning_vi: { type: Type.STRING, description: "The Vietnamese meaning." },
                    pos: { type: Type.STRING, description: "Part of speech (e.g., 'noun', 'verb')." },
                    example_en: { type: Type.STRING, description: "Example sentence in English." },
                    example_vi: { type: Type.STRING, description: "Vietnamese translation of the example sentence." },
                },
                required: ["level", "word", "ipa", "meaning_vi", "pos", "example_en", "example_vi"],
            }
        };

        try {
            const response = await ai.models.generateContent({
                model: model,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: responseSchema,
                },
            });

            const jsonText = (response.text ?? '').trim();
            const result = JSON.parse(jsonText);
            wordPool = (result as VocabularyWord[]).slice(0, POOL_SIZE);

            try {
                sessionStorage.setItem(poolCacheKey, JSON.stringify(wordPool));
            } catch (e) {
                console.warn("Could not write vocabulary pool to sessionStorage", e);
            }
        } catch (error) {
            console.error(`Error fetching CEFR level ${level} vocabulary:`, error);
            throw new Error("Failed to fetch CEFR vocabulary from Gemini API.");
        }
    }

    const start = (page - 1) * limit;
    const end = start + limit;
    const pagedWords = wordPool.slice(start, end);

    return pagedWords;
};


/**
 * Fetches a sample conversation for a given CEFR level and optional topic.
 * @param level The CEFR level for the conversation.
 * @param topic An optional user-provided topic for the conversation.
 * @returns A promise that resolves to an array of conversation lines.
 */
export const fetchConversation = async (level: CEFRLevel, topic?: string): Promise<ConversationLine[]> => {
    if (!topic) {
        const cacheKey = `cefr-conversation-${level}`;
        try {
            const cachedData = sessionStorage.getItem(cacheKey);
            if (cachedData) {
                console.log("Serving conversation from cache:", cacheKey);
                return JSON.parse(cachedData);
            }
        } catch (e) {
            console.warn("Could not read conversation from sessionStorage", e);
        }
    }

    const model = 'gemini-2.5-flash';
    
    const topicPrompt = topic ? `about the topic "${topic}"` : "on a common, simple daily life subject";

    const prompt = `Generate a short, simple conversation in English ${topicPrompt} suitable for CEFR level ${level}. The conversation should have around 6-8 turns between two people (A and B). For each line, provide a relevant topic for the entire conversation, the turn number, the English text (en), and the Vietnamese translation (vi). The topic should be consistent for all turns.`;

    const responseSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                topic: { type: Type.STRING, description: "The conversation topic. Should be the same for all lines in the conversation." },
                turn: { type: Type.INTEGER, description: "The turn number in the conversation, starting from 1." },
                en: { type: Type.STRING, description: "The line in English." },
                vi: { type: Type.STRING, description: "The Vietnamese translation of the line." },
            },
            required: ["topic", "turn", "en", "vi"],
        }
    };

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });

        const jsonText = (response.text ?? '').trim();
        const result = JSON.parse(jsonText);
        
        if (!topic) {
            try {
                const cacheKey = `cefr-conversation-${level}`;
                sessionStorage.setItem(cacheKey, JSON.stringify(result));
            } catch (e) {
                console.warn("Could not write conversation to sessionStorage", e);
            }
        }

        return result as ConversationLine[];
    } catch (error) {
        console.error(`Error fetching conversation for CEFR level ${level}:`, error);
        throw new Error("Failed to fetch conversation from Gemini API.");
    }
};

/**
 * Fetches additional conversation lines to continue an existing conversation.
 * @param existingConversation The current conversation lines.
 * @param level The CEFR level for the conversation.
 * @returns A promise that resolves to an array of new conversation lines.
 */
export const fetchMoreConversationLines = async (existingConversation: ConversationLine[], level: CEFRLevel): Promise<ConversationLine[]> => {
    if (existingConversation.length === 0) return [];

    const model = 'gemini-2.5-flash';
    const lastTurn = existingConversation[existingConversation.length - 1];
    const conversationHistory = existingConversation.map(line => `${line.turn % 2 === 1 ? 'A' : 'B'}: ${line.en}`).join('\n');
    
    const prompt = `
        This is an existing conversation for a CEFR level ${level} English learner. The topic is "${lastTurn.topic}".
        Here is the conversation so far:
        ${conversationHistory}

        Please generate the next 2 to 4 turns of this conversation, continuing the dialogue logically. 
        Maintain the same CEFR level and topic. For each new line, provide:
        - The same topic: "${lastTurn.topic}"
        - The turn number (continuing from ${lastTurn.turn}).
        - The English text (en).
        - The Vietnamese translation (vi).
    `;

    const responseSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                topic: { type: Type.STRING },
                turn: { type: Type.INTEGER },
                en: { type: Type.STRING },
                vi: { type: Type.STRING },
            },
            required: ["topic", "turn", "en", "vi"],
        }
    };

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });

        const jsonText = (response.text ?? '').trim();
        const result = JSON.parse(jsonText);
        return result as ConversationLine[];
    } catch (error) {
        console.error(`Error fetching more conversation lines for CEFR level ${level}:`, error);
        throw new Error("Failed to fetch more conversation lines from Gemini API.");
    }
};


/**
 * Checks a sentence for grammar errors.
 * @param text The English sentence to check.
 * @returns A promise that resolves to a grammar check result object.
 */
export const checkGrammar = async (text: string): Promise<GrammarCheckResult> => {
    const model = 'gemini-2.5-flash';
    const prompt = `Analyze the following English sentence for grammatical errors. Provide the original sentence, a corrected version, and a list of errors. For each error, include the incorrect part, a clear explanation of the mistake in Vietnamese, and the suggested correction. If there are no errors, the corrected sentence should be the same as the original, and the errors array should be empty. The sentence is: "${text}"`;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            original_sentence: { type: Type.STRING, description: "The original sentence provided by the user." },
            corrected_sentence: { type: Type.STRING, description: "The grammatically correct version of the sentence." },
            errors: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        error_text: { type: Type.STRING, description: "The specific part of the sentence with the error." },
                        explanation: { type: Type.STRING, description: "A clear explanation of the grammatical mistake in Vietnamese." },
                        suggestion: { type: Type.STRING, description: "The suggested correction for the error." }
                    },
                    required: ["error_text", "explanation", "suggestion"]
                }
            }
        },
        required: ["original_sentence", "corrected_sentence", "errors"],
    };

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });

        const jsonText = (response.text ?? '').trim();
        return JSON.parse(jsonText) as GrammarCheckResult;
    } catch (error) {
        console.error("Error checking grammar:", error);
        throw new Error("Failed to check grammar using Gemini API.");
    }
};


/**
 * Fetches a complete, unique CEFR exam for a given level.
 * @param level The CEFR level for the exam.
 * @returns A promise that resolves to an array of exam questions.
 */
export const fetchCefrExam = async (level: CEFRLevel): Promise<ExamQuestion[]> => {
    const model = 'gemini-2.5-flash';
    const totalQuestions = 40;

    const prompt = `
        Generate a complete and unique CEFR level ${level} English mock exam with exactly ${totalQuestions} questions.
        The exam must be different every time this prompt is called.
        The questions should be divided into three sections: 'Nghe hiểu' (Listening Comprehension), 'Đọc hiểu' (Reading Comprehension), and 'Viết' (Writing, e.g., sentence completion, grammar).
        For each question, provide:
        1.  'section': The section name ('Nghe hiểu', 'Đọc hiểu', or 'Viết').
        2.  'question_text': The main text of the question. For 'Nghe hiểu', this is the question part, not the audio part.
        3.  'audio_script': (ONLY for 'Nghe hiểu' section) The text that should be read aloud to the user. For other sections, this should be null or omitted.
        4.  'options': An array of 4 distinct multiple-choice options.
        5.  'correct_answer': The exact string of the correct option from the 'options' array.
        6.  'explanation': A brief, clear explanation in Vietnamese explaining why the correct answer is right.
    `;

    const responseSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                section: { type: Type.STRING, description: "Section: 'Nghe hiểu', 'Đọc hiểu', or 'Viết'." },
                question_text: { type: Type.STRING, description: "The question text." },
                audio_script: { type: Type.STRING, description: "Text to be read for listening questions. Null for others." },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correct_answer: { type: Type.STRING, description: "The correct answer string." },
                explanation: { type: Type.STRING, description: "Explanation in Vietnamese." }
            },
            required: ["section", "question_text", "options", "correct_answer", "explanation"],
        }
    };

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });

        const jsonText = (response.text ?? '').trim();
        const result = JSON.parse(jsonText);
        // Ensure exactly 40 questions are returned
        if (Array.isArray(result) && result.length > totalQuestions) {
            return result.slice(0, totalQuestions);
        }
        return result as ExamQuestion[];
    } catch (error) {
        console.error(`Error fetching CEFR level ${level} exam:`, error);
        throw new Error("Failed to fetch CEFR exam from Gemini API.");
    }
};
