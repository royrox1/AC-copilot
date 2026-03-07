import { useState, useEffect } from 'react';

export const useLearning = () => {
    const [learningData, setLearningData] = useState({
        edits: [],
        patterns: {
            preferredTerms: {},
            avgLength: { featureArea: 0, userStory: 0, criteria: 0 },
            priorityDistribution: { High: 0, Medium: 0, Low: 0 }
        },
        examples: []
    });

    useEffect(() => {
        const saved = localStorage.getItem('ac-learning-data');
        if (saved) {
            try {
                setLearningData(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to load learning data:', e);
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('ac-learning-data', JSON.stringify(learningData));
    }, [learningData]);

    const analyzeEdit = (original, edited) => {
        const changes = {
            timestamp: new Date().toISOString(),
            original: original,
            edited: edited,
            insights: {
                termChanges: [],
                lengthChanges: {},
                structuralChanges: []
            }
        };

        const extractTerms = (text) => text.toLowerCase().match(/\b\w+\b/g) || [];
        const originalTerms = extractTerms(JSON.stringify(original));
        const editedTerms = extractTerms(JSON.stringify(edited));

        const uniqueEdited = editedTerms.filter(t => !originalTerms.includes(t) && t.length > 3);
        const uniqueOriginal = originalTerms.filter(t => !editedTerms.includes(t) && t.length > 3);

        if (uniqueOriginal.length > 0 && uniqueEdited.length > 0) {
            changes.insights.termChanges.push({
                removed: uniqueOriginal.slice(0, 5),
                added: uniqueEdited.slice(0, 5)
            });
        }

        changes.insights.lengthChanges = {
            featureArea: {
                before: original.featureArea.length,
                after: edited.featureArea.length,
                change: edited.featureArea.length - original.featureArea.length
            },
            userStory: {
                before: original.userStory.length,
                after: edited.userStory.length,
                change: edited.userStory.length - original.userStory.length
            },
            criteriaAvg: (() => {
                const before = Math.round(original.criteria.reduce((sum, c) => sum + c.length, 0) / original.criteria.length);
                const after = Math.round(edited.criteria.reduce((sum, c) => sum + c.length, 0) / edited.criteria.length);
                return { before, after, change: after - before };
            })()
        };

        if (original.criteria.length !== edited.criteria.length) {
            changes.insights.structuralChanges.push({
                type: 'criteria_count',
                from: original.criteria.length,
                to: edited.criteria.length
            });
        }

        if (original.priority !== edited.priority) {
            changes.insights.structuralChanges.push({
                type: 'priority_change',
                from: original.priority,
                to: edited.priority
            });
        }

        return changes;
    };

    const updateLearningPatterns = (editHistory) => {
        const patterns = {
            preferredTerms: {},
            avgLength: { featureArea: [], userStory: [], criteria: [] },
            priorityDistribution: { High: 0, Medium: 0, Low: 0 }
        };

        editHistory.forEach(edit => {
            edit.insights.termChanges.forEach(change => {
                change.added.forEach(term => {
                    patterns.preferredTerms[term] = (patterns.preferredTerms[term] || 0) + 1;
                });
            });

            patterns.avgLength.featureArea.push(edit.insights.lengthChanges.featureArea.after);
            patterns.avgLength.userStory.push(edit.insights.lengthChanges.userStory.after);
            patterns.avgLength.criteria.push(edit.insights.lengthChanges.criteriaAvg.after);

            patterns.priorityDistribution[edit.edited.priority]++;
        });

        patterns.avgLength.featureArea = Math.round(
            patterns.avgLength.featureArea.reduce((a, b) => a + b, 0) / patterns.avgLength.featureArea.length || 0
        );
        patterns.avgLength.userStory = Math.round(
            patterns.avgLength.userStory.reduce((a, b) => a + b, 0) / patterns.avgLength.userStory.length || 0
        );
        patterns.avgLength.criteria = Math.round(
            patterns.avgLength.criteria.reduce((a, b) => a + b, 0) / patterns.avgLength.criteria.length || 0
        );

        return patterns;
    };

    const recordEdit = (originalAC, finalAC) => {
        const editAnalysis = analyzeEdit(originalAC, finalAC);
        const newEdits = [...learningData.edits, editAnalysis];
        const newPatterns = updateLearningPatterns(newEdits);

        setLearningData({
            edits: newEdits.slice(-20),
            patterns: newPatterns,
            examples: learningData.examples
        });
    };

    const toggleLikeAC = (ac, setSuccessMsg) => {
        const isLiked = learningData.examples.some(ex => ex.id === ac.id);
        let newExamples;

        if (isLiked) {
            newExamples = learningData.examples.filter(ex => ex.id !== ac.id);
            if (setSuccessMsg) setSuccessMsg('💔 Removed from Golden Samples');
        } else {
            newExamples = [...learningData.examples, ac];
            if (setSuccessMsg) setSuccessMsg('❤️ Added to Golden Samples');
        }

        setLearningData({
            ...learningData,
            examples: newExamples
        });
    };

    const resetLearningData = () => {
        setLearningData({
            edits: [],
            patterns: {
                preferredTerms: {},
                avgLength: { featureArea: 0, userStory: 0, criteria: 0 },
                priorityDistribution: { High: 0, Medium: 0, Low: 0 }
            },
            examples: []
        });
        localStorage.removeItem('ac-learning-data');
    };

    return {
        learningData,
        setLearningData,
        recordEdit,
        toggleLikeAC,
        resetLearningData
    };
};
