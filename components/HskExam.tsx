import React from 'react';

const HskExam: React.FC<{ speechRate: number; selectedVoice: string }> = () => {
    return (
        <div>
            <h2 className="text-3xl font-bold mb-6 text-primary">Thi Thử HSK</h2>
            <div className="text-center p-10 bg-light-card dark:bg-dark-card rounded-lg">
                <p className="text-xl">Tính năng này hiện không khả dụng.</p>
                <p>Chức năng thi thử HSK đã được thay thế bằng Thi thử CEFR.</p>
            </div>
        </div>
    );
};

export default HskExam;
