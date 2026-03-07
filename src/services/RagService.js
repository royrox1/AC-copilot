export const RagService = {
    calculateSimilarity: (text1, text2) => {
        const words1 = text1.toLowerCase().split(/\s+/);
        const words2 = text2.toLowerCase().split(/\s+/);
        const set1 = new Set(words1);
        const set2 = new Set(words2);
        const intersection = [...set1].filter(w => set2.has(w)).length;
        const union = new Set([...set1, ...set2]).size;
        return union > 0 ? intersection / union : 0;
    },

    findRelevantDocs: (query, knowledgeBase, threshold = 0.05, limit = 3) => {
        if (!knowledgeBase || knowledgeBase.length === 0) return [];

        const scored = knowledgeBase.map(doc => ({
            ...doc,
            score: RagService.calculateSimilarity(query, doc.content)
        }));

        return scored
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .filter(doc => doc.score > threshold);
    }
};
