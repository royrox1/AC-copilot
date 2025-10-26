import React, { useState } from 'react';
import { Zap, Settings, X, CheckCircle, AlertCircle, Database, Trash2, Edit2, Save, Copy, Download, BarChart } from 'lucide-react';

const ACGenerator = () => {
  const [inputText, setInputText] = useState('');
  const [generatedACs, setGeneratedACs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [showRAG, setShowRAG] = useState(false);
  const [useAI, setUseAI] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('');
  const [ragEnabled, setRagEnabled] = useState(false);
  const [knowledgeBase, setKnowledgeBase] = useState([]);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocContent, setNewDocContent] = useState('');
  const [editingAC, setEditingAC] = useState(null);
  const [editedAC, setEditedAC] = useState(null);
  const [learningData, setLearningData] = useState({
    edits: [],
    patterns: {
      preferredTerms: {},
      avgLength: { featureArea: 0, userStory: 0, criteria: 0 },
      priorityDistribution: { High: 0, Medium: 0, Low: 0 }
    }
  });
  const [showInsights, setShowInsights] = useState(false);
  const [originalAC, setOriginalAC] = useState(null);

  // Load state from localStorage on mount
  React.useEffect(() => {
    const savedLearningData = localStorage.getItem('ac-learning-data');
    const savedKnowledgeBase = localStorage.getItem('ac-knowledge-base');
    const savedGeneratedACs = localStorage.getItem('ac-generated-acs');

    if (savedLearningData) {
      try {
        setLearningData(JSON.parse(savedLearningData));
      } catch (e) {
        console.error('Failed to load learning data:', e);
      }
    }

    if (savedKnowledgeBase) {
      try {
        setKnowledgeBase(JSON.parse(savedKnowledgeBase));
      } catch (e) {
        console.error('Failed to load knowledge base:', e);
      }
    }

    if (savedGeneratedACs) {
      try {
        setGeneratedACs(JSON.parse(savedGeneratedACs));
      } catch (e) {
        console.error('Failed to load generated ACs:', e);
      }
    }
  }, []);

  // Save learningData to localStorage whenever it changes
  React.useEffect(() => {
    localStorage.setItem('ac-learning-data', JSON.stringify(learningData));
  }, [learningData]);

  // Save knowledgeBase to localStorage whenever it changes
  React.useEffect(() => {
    localStorage.setItem('ac-knowledge-base', JSON.stringify(knowledgeBase));
  }, [knowledgeBase]);

  // Save generatedACs to localStorage whenever it changes
  React.useEffect(() => {
    localStorage.setItem('ac-generated-acs', JSON.stringify(generatedACs));
  }, [generatedACs]);

  const resetLearningData = () => {
    const confirmed = window.confirm('Are you sure you want to reset all learning data? This will remove all learned patterns and preferences.');
    if (confirmed) {
      const initialData = {
        edits: [],
        patterns: {
          preferredTerms: {},
          avgLength: { featureArea: 0, userStory: 0, criteria: 0 },
          priorityDistribution: { High: 0, Medium: 0, Low: 0 }
        }
      };
      setLearningData(initialData);
      localStorage.removeItem('ac-learning-data');
      setSuccessMsg('✅ Learning data reset successfully!');
      setShowInsights(false);
    }
  };

  const handleFileUpload = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setErrorMsg('');

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileType = file.type;
        const fileName = file.name;
        const fileExtension = fileName.split('.').pop().toLowerCase();

        let content = '';
        let extractedText = '';

        // Text files
        if (fileType === 'text/plain' || fileExtension === 'txt') {
          content = await file.text();
        }
        // PDF files
        else if (fileType === 'application/pdf' || fileExtension === 'pdf') {
          extractedText = await extractTextFromPDF(file);
          content = `[PDF Document: ${fileName}]\n\n${extractedText}`;
        }
        // Word documents
        else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
                 fileType === 'application/msword' ||
                 fileExtension === 'docx' || fileExtension === 'doc') {
          extractedText = await extractTextFromWord(file);
          content = `[Word Document: ${fileName}]\n\n${extractedText}`;
        }
        // Video files
        else if (fileType.startsWith('video/') || 
                 ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv'].includes(fileExtension)) {
          extractedText = await extractVideoMetadata(file);
          content = `[Video: ${fileName}]\n\n${extractedText}`;
        }
        // Audio files
        else if (fileType.startsWith('audio/') || 
                 ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(fileExtension)) {
          extractedText = await extractAudioMetadata(file);
          content = `[Audio: ${fileName}]\n\n${extractedText}`;
        }
        // Image files (OCR would be needed for text extraction)
        else if (fileType.startsWith('image/') || 
                 ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileExtension)) {
          content = `[Image: ${fileName}]\nSize: ${(file.size / 1024).toFixed(2)} KB\n\n⚠️ Image uploaded. Please manually describe the content or add relevant text.`;
        }
        // CSV/Excel files
        else if (['csv', 'xls', 'xlsx'].includes(fileExtension)) {
          extractedText = await extractSpreadsheetData(file);
          content = `[Spreadsheet: ${fileName}]\n\n${extractedText}`;
        }
        // Other formats
        else {
          content = `[File: ${fileName}]\nType: ${fileType || fileExtension}\nSize: ${(file.size / 1024).toFixed(2)} KB\n\n⚠️ Unsupported format. Please manually add key content.`;
        }

        if (content && content.trim().length > 0) {
          const newDoc = {
            id: Date.now() + i,
            title: fileName,
            content: content.substring(0, 10000),
            type: fileType || fileExtension,
            fileSize: file.size,
            uploadedAt: new Date().toISOString()
          };

          setKnowledgeBase(prev => [...prev, newDoc]);
        }
      }

      setSuccessMsg(`✅ Uploaded ${files.length} file(s) successfully`);
    } catch (err) {
      setErrorMsg(`Upload error: ${err.message}`);
      console.error('Upload error:', err);
    } finally {
      event.target.value = '';
    }
  };

  const extractTextFromPDF = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target.result;
          const uint8Array = new Uint8Array(arrayBuffer);
          
          let text = '';
          const decoder = new TextDecoder('utf-8');
          const pdfText = decoder.decode(uint8Array);
          
          // Simple text extraction
          const textMatches = pdfText.match(/BT\s+(.*?)\s+ET/gs);
          if (textMatches) {
            textMatches.forEach(match => {
              const cleanText = match
                .replace(/BT|ET/g, '')
                .replace(/\[.*?\]/g, '')
                .replace(/Tj|TJ|Td|TD|Tm|T\*/g, ' ')
                .replace(/\(([^)]+)\)/g, '$1')
                .replace(/\s+/g, ' ')
                .trim();
              text += cleanText + ' ';
            });
          }

          if (text.trim().length < 50) {
            text = pdfText.replace(/[^\x20-\x7E\n]/g, '').replace(/\s+/g, ' ').trim();
          }

          if (text.trim().length < 50) {
            text = `PDF file: ${file.name}\nSize: ${(file.size / 1024).toFixed(2)} KB\nPages: ~${Math.ceil(file.size / 50000)}\n\n⚠️ Limited text extraction. Please manually add key content.`;
          }

          resolve(text.substring(0, 8000));
        } catch (err) {
          resolve(`PDF: ${file.name} (${(file.size / 1024).toFixed(2)} KB)\n\n⚠️ Extraction failed. Please add content manually.`);
        }
      };
      reader.onerror = () => resolve(`Error reading PDF: ${file.name}`);
      reader.readAsArrayBuffer(file);
    });
  };

  const extractTextFromWord = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target.result;
          const uint8Array = new Uint8Array(arrayBuffer);
          
          let text = '';
          const decoder = new TextDecoder('utf-8');
          const content = decoder.decode(uint8Array);
          
          const textMatches = content.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
          if (textMatches) {
            text = textMatches.map(match => 
              match.replace(/<\/?w:t[^>]*>/g, '')
            ).join(' ');
          }

          if (text.trim().length < 50) {
            text = content.replace(/[^\x20-\x7E\n]/g, '').replace(/\s+/g, ' ').trim();
          }

          if (text.trim().length < 50) {
            text = `Word: ${file.name} (${(file.size / 1024).toFixed(2)} KB)\n\n⚠️ Limited extraction. Please add key content manually.`;
          }

          resolve(text.substring(0, 8000));
        } catch (err) {
          resolve(`Word: ${file.name}\n\n⚠️ Extraction failed. Please add content manually.`);
        }
      };
      reader.onerror = () => resolve(`Error reading: ${file.name}`);
      reader.readAsArrayBuffer(file);
    });
  };

  const extractVideoMetadata = async (file) => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        const duration = Math.floor(video.duration);
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        
        const metadata = `Video: ${file.name}
Size: ${(file.size / (1024 * 1024)).toFixed(2)} MB
Duration: ${minutes}:${seconds.toString().padStart(2, '0')}
Resolution: ${video.videoWidth}x${video.videoHeight}
Format: ${file.type}

📝 IMPORTANT: Add video transcript or key points below:
- Main topics discussed:
- Key terminology:
- Important timestamps:

This will help RAG provide better context.`;

        resolve(metadata);
      };

      video.onerror = () => {
        resolve(`Video: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)\n\n⚠️ Please add transcript or key points manually.`);
      };

      video.src = URL.createObjectURL(file);
    });
  };

  const extractAudioMetadata = async (file) => {
    return new Promise((resolve) => {
      const audio = document.createElement('audio');
      audio.preload = 'metadata';

      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(audio.src);
        const duration = Math.floor(audio.duration);
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        
        const metadata = `Audio: ${file.name}
Size: ${(file.size / (1024 * 1024)).toFixed(2)} MB
Duration: ${minutes}:${seconds.toString().padStart(2, '0')}
Format: ${file.type}

📝 IMPORTANT: Add audio transcript or key points:
- Main topics discussed:
- Key terminology:
- Speaker information:
- Important timestamps:`;

        resolve(metadata);
      };

      audio.onerror = () => {
        resolve(`Audio: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)\n\n⚠️ Please add transcript or key points manually.`);
      };

      audio.src = URL.createObjectURL(file);
    });
  };

  const extractSpreadsheetData = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target.result;
          let preview = '';

          if (file.name.endsWith('.csv')) {
            const lines = content.split('\n').slice(0, 10);
            preview = lines.join('\n');
          } else {
            preview = `Spreadsheet data from ${file.name}`;
          }

          const text = `Spreadsheet: ${file.name}
Size: ${(file.size / 1024).toFixed(2)} KB
${preview}

⚠️ Please add key data points or summary manually.`;

          resolve(text);
        } catch (err) {
          resolve(`Spreadsheet: ${file.name}\n\n⚠️ Please add data manually.`);
        }
      };
      reader.onerror = () => resolve(`Error reading: ${file.name}`);
      
      if (file.name.endsWith('.csv')) {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    });
  };

  const addWebLink = async () => {
    const url = prompt('Enter web link (URL):');
    if (!url || !url.trim()) return;

    try {
      new URL(url); // Validate URL
      
      const newDoc = {
        id: Date.now(),
        title: `Web: ${url}`,
        content: `Web Link: ${url}\n\n⚠️ Please manually add key content from this webpage.\n\nSuggested content to add:\n- Main topic\n- Key points\n- Important terminology\n- Relevant sections`,
        type: 'web-link',
        url: url,
        uploadedAt: new Date().toISOString()
      };

      setKnowledgeBase(prev => [...prev, newDoc]);
      setSuccessMsg('✅ Web link added. Please add manual content.');
    } catch (err) {
      setErrorMsg('Invalid URL format');
    }
  };

  const addDocument = () => {
    if (!newDocTitle.trim() || newDocTitle.trim().length < 3) {
      setErrorMsg('Title must be at least 3 characters');
      return;
    }
    if (!newDocContent.trim() || newDocContent.trim().length < 20) {
      setErrorMsg('Content must be at least 20 characters');
      return;
    }

    const newDoc = {
      id: Date.now(),
      title: newDocTitle,
      content: newDocContent
    };

    setKnowledgeBase([...knowledgeBase, newDoc]);
    setNewDocTitle('');
    setNewDocContent('');
    setSuccessMsg(`✅ Added "${newDocTitle}"`);
  };

  const deleteDocument = (docId) => {
    setKnowledgeBase(knowledgeBase.filter(doc => doc.id !== docId));
    setSuccessMsg('✅ Document removed');
  };

  const generateMockACs = (request) => {
    return [
      {
        id: 1,
        featureArea: 'Core Functionality',
        userStory: `As a user, I want to ${request.substring(0, 40)}`,
        criteria: [
          'Given user action, when triggered, then system responds',
          'When data is valid, the system accepts the input',
          'The system displays a confirmation message'
        ],
        priority: 'High'
      },
      {
        id: 2,
        featureArea: 'Error Handling',
        userStory: `Error handling for ${request.substring(0, 30)}`,
        criteria: [
          'When invalid data is provided, show error message',
          'When network fails, show retry option',
          'All errors are logged'
        ],
        priority: 'High'
      }
    ];
  };

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
      criteriaAvg: {
        before: Math.round(original.criteria.reduce((sum, c) => sum + c.length, 0) / original.criteria.length),
        after: Math.round(edited.criteria.reduce((sum, c) => sum + c.length, 0) / edited.criteria.length),
        change: Math.round(edited.criteria.reduce((sum, c) => sum + c.length, 0) / edited.criteria.length) - 
                Math.round(original.criteria.reduce((sum, c) => sum + c.length, 0) / original.criteria.length)
      }
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

  const calculateSimilarity = (text1, text2) => {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    const intersection = [...set1].filter(w => set2.has(w)).length;
    const union = new Set([...set1, ...set2]).size;
    return union > 0 ? intersection / union : 0;
  };

  const handleGenerate = async () => {
    if (!inputText.trim()) {
      setErrorMsg('Please enter a request');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      let ragContext = '';
      
      // RAG: Find relevant documents
      if (ragEnabled && knowledgeBase.length > 0) {
        const scored = knowledgeBase.map(doc => ({
          ...doc,
          score: calculateSimilarity(inputText, doc.content)
        }));
        
        const topDocs = scored
          .sort((a, b) => b.score - a.score)
          .slice(0, 3) // Top 3 most relevant
          .filter(doc => doc.score > 0.05); // Minimum relevance threshold
        
        if (topDocs.length > 0) {
          ragContext = topDocs
            .map(doc => `[Source: ${doc.title}]\n${doc.content.substring(0, 2000)}`)
            .join('\n\n---\n\n');
        }
      }

      if (useAI && apiKey) {
        let prompt = `Generate professional acceptance criteria for: "${inputText}". Return valid JSON array with objects containing: id, featureArea, userStory, criteria (array), priority`;
        
        // Add learning patterns
        if (learningData.edits.length > 0) {
          prompt += `\n\n--- User Writing Style ---`;
          prompt += `\nPreferred Feature Area length: ~${learningData.patterns.avgLength.featureArea} chars`;
          prompt += `\nPreferred User Story length: ~${learningData.patterns.avgLength.userStory} chars`;
          prompt += `\nPreferred Criteria length: ~${learningData.patterns.avgLength.criteria} chars`;
          
          const topTerms = Object.entries(learningData.patterns.preferredTerms)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([term]) => term);
          
          if (topTerms.length > 0) {
            prompt += `\nPreferred terminology: ${topTerms.join(', ')}`;
          }
        }
        
        // Add RAG context
        if (ragContext) {
          prompt += `\n\n--- Reference Context from Knowledge Base ---\n${ragContext}`;
          prompt += `\n\nUse the above context to inform the acceptance criteria where relevant.`;
        }
        
        let response;
        if (selectedProvider === 'openai') {
          response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: modelName || 'gpt-4-turbo',
              messages: [
                { role: 'system', content: 'You are a Business Analyst expert. Return only valid JSON array of acceptance criteria objects.' },
                { role: 'user', content: prompt }
              ],
              temperature: 0.7,
              max_tokens: 2000
            })
          });
        } else {
          response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
              model: modelName || 'claude-3-5-sonnet-20241022',
              max_tokens: 2048,
              messages: [{ role: 'user', content: prompt }]
            })
          });
        }

        if (!response.ok) throw new Error('API call failed');

        const data = await response.json();
        let content = selectedProvider === 'openai' 
          ? data.choices?.[0]?.message?.content || ''
          : data.content?.[0]?.text || '';

        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const acs = JSON.parse(jsonMatch[0]);
          setGeneratedACs(acs);
          const contextInfo = ragContext ? ` using ${knowledgeBase.length} knowledge base documents` : '';
          setSuccessMsg(`✅ Generated ACs successfully!${contextInfo}`);
        } else {
          throw new Error('Invalid response format');
        }
      } else {
        const acs = generateMockACs(inputText);
        setGeneratedACs(acs);
        const contextInfo = ragContext ? ` (RAG context available but using mock mode)` : '';
        setSuccessMsg(`✅ Generated ACs (Mock mode)${contextInfo}`);
      }
    } catch (err) {
      setErrorMsg(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const startEditAC = (ac) => {
    setEditingAC(ac.id);
    setEditedAC({ ...ac });
    setOriginalAC({ ...ac });
  };

  const cancelEditAC = () => {
    setEditingAC(null);
    setEditedAC(null);
    setOriginalAC(null);
  };

  const saveEditAC = () => {
    if (!editedAC || !originalAC) return;
    
    const editAnalysis = analyzeEdit(originalAC, editedAC);
    const newEdits = [...learningData.edits, editAnalysis];
    const newPatterns = updateLearningPatterns(newEdits);
    
    setLearningData({
      edits: newEdits.slice(-20),
      patterns: newPatterns
    });

    setGeneratedACs(generatedACs.map(ac => 
      ac.id === editedAC.id ? editedAC : ac
    ));
    
    setEditingAC(null);
    setEditedAC(null);
    setOriginalAC(null);
    setSuccessMsg('✅ AC updated & learning patterns captured!');
  };

  const deleteAC = (acId) => {
    setGeneratedACs(generatedACs.filter(ac => ac.id !== acId));
    setSuccessMsg('✅ AC deleted');
  };

  const duplicateAC = (ac) => {
    const newAC = { ...ac, id: Date.now(), featureArea: `${ac.featureArea} (Copy)` };
    setGeneratedACs([...generatedACs, newAC]);
    setSuccessMsg('✅ AC duplicated');
  };

  const exportACs = () => {
    const exportText = generatedACs.map(ac => 
      `Feature Area: ${ac.featureArea}\nPriority: ${ac.priority}\n\nUser Story:\n${ac.userStory}\n\nAcceptance Criteria:\n${ac.criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n\n${'='.repeat(50)}\n\n`
    ).join('');

    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `acceptance-criteria-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setSuccessMsg('✅ ACs exported');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 p-6 bg-gradient-to-r from-purple-900/40 to-blue-900/40 backdrop-blur-lg rounded-2xl border border-purple-500/20 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-white">🚀 AC Generator Pro</h1>
            <p className="text-purple-200 mt-2">AI-powered Acceptance Criteria Generator</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowInsights(!showInsights)} 
              className="p-4 bg-blue-600 hover:bg-blue-500 rounded-xl text-white transition"
              title="Learning Insights"
            >
              <BarChart className="w-6 h-6" />
            </button>
            <button 
              onClick={() => setShowRAG(!showRAG)} 
              className="p-4 bg-green-600 hover:bg-green-500 rounded-xl text-white transition"
              title="RAG"
            >
              <Database className="w-6 h-6" />
            </button>
            <button 
              onClick={() => setShowApiConfig(!showApiConfig)} 
              className="p-4 bg-orange-600 hover:bg-orange-500 rounded-xl text-white transition"
              title="API Config"
            >
              <Settings className="w-6 h-6" />
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-500 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-200">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 bg-green-900/50 border border-green-500 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-green-200">{successMsg}</span>
          </div>
        )}

        {showInsights && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl border border-blue-500/50 w-full max-w-2xl max-h-[70vh] overflow-y-auto">
              <div className="sticky top-0 bg-blue-900 p-4 flex justify-between items-center">
                <h2 className="text-lg font-bold text-white">📊 Learning Insights</h2>
                <button onClick={() => setShowInsights(false)} className="text-white hover:text-gray-200">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {learningData.edits.length === 0 ? (
                  <div className="p-6 bg-slate-700/30 border border-slate-600/50 rounded-xl text-center">
                    <p className="text-slate-300 mb-2">📝 No Learning Data Yet</p>
                    <p className="text-slate-400 text-sm">Start editing ACs to build your learning patterns!</p>
                    <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg text-left text-xs text-blue-200">
                      <p className="font-semibold mb-2">💡 How it works:</p>
                      <ul className="space-y-1 ml-4 list-disc">
                        <li>Generate ACs and click "Edit" on any</li>
                        <li>Make changes to match your style</li>
                        <li>Click "Save" to record patterns</li>
                        <li>System learns your preferences automatically</li>
                        <li>Future generations will match your style</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 bg-gradient-to-br from-purple-900/40 to-blue-900/40 rounded-lg border border-purple-500/30">
                        <p className="text-xs text-purple-300 mb-1">Total Edits</p>
                        <p className="text-xl font-bold text-white">{learningData.edits.length}</p>
                      </div>
                      <div className="p-3 bg-gradient-to-br from-green-900/40 to-teal-900/40 rounded-lg border border-green-500/30">
                        <p className="text-xs text-green-300 mb-1">Avg Story</p>
                        <p className="text-xl font-bold text-white">{learningData.patterns.avgLength.userStory || 0}</p>
                      </div>
                      <div className="p-3 bg-gradient-to-br from-blue-900/40 to-indigo-900/40 rounded-lg border border-blue-500/30">
                        <p className="text-xs text-blue-300 mb-1">Avg Criteria</p>
                        <p className="text-xl font-bold text-white">{learningData.patterns.avgLength.criteria || 0}</p>
                      </div>
                    </div>

                    {Object.keys(learningData.patterns.preferredTerms).length > 0 && (
                      <div className="p-3 bg-slate-700/30 border border-slate-600/30 rounded-lg">
                        <h3 className="text-sm font-semibold text-white mb-2">🎯 Preferred Terms</h3>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(learningData.patterns.preferredTerms)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 10)
                            .map(([term, count]) => (
                              <span key={term} className="px-2 py-1 bg-purple-600/30 border border-purple-500/50 rounded-full text-xs text-purple-200">
                                {term} ({count})
                              </span>
                            ))}
                        </div>
                      </div>
                    )}

                    <div className="p-3 bg-gradient-to-br from-green-900/30 to-blue-900/30 border border-green-500/30 rounded-lg">
                      <h3 className="text-sm font-semibold text-white mb-2">💡 Your Style</h3>
                      <div className="space-y-1 text-xs text-slate-200">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Feature Area:</span>
                          <strong>{learningData.patterns.avgLength.featureArea} chars</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">User Story:</span>
                          <strong>{learningData.patterns.avgLength.userStory} chars</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Criteria:</span>
                          <strong>{learningData.patterns.avgLength.criteria} chars</strong>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={resetLearningData}
                        className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-lg font-medium transition flex items-center justify-center gap-2 text-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                        Reset Learning
                      </button>
                      <button
                        onClick={() => {
                          const dataStr = JSON.stringify(learningData, null, 2);
                          const blob = new Blob([dataStr], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `ac-learning-${Date.now()}.json`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg font-medium transition flex items-center justify-center gap-2 text-sm"
                      >
                        <Download className="w-4 h-4" />
                        Export
                      </button>
                      <button
                        onClick={() => setShowInsights(false)}
                        className="flex-1 bg-slate-600 hover:bg-slate-500 text-white py-2 rounded-lg font-medium transition text-sm"
                      >
                        Close
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {showRAG && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl border border-green-500/50 w-full max-w-md max-h-96 overflow-y-auto">
              <div className="sticky top-0 bg-green-900 p-6 flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">🗄️ Knowledge Base</h2>
                <button onClick={() => setShowRAG(false)} className="text-white hover:text-gray-200">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <label className="flex items-center gap-3 p-3 bg-green-900/30 rounded-lg cursor-pointer">
                  <input type="checkbox" checked={ragEnabled} onChange={(e) => setRagEnabled(e.target.checked)} className="w-4 h-4" />
                  <span className="text-white font-medium">Enable RAG</span>
                </label>

                {ragEnabled && (
                  <div className="space-y-3">
                    <div className="p-3 bg-green-900/20 border border-green-500/30 rounded-lg text-xs text-green-200">
                      <p className="font-semibold mb-1">✅ RAG Context Enabled</p>
                      <p>The AI will use relevant documents from your knowledge base to generate more accurate and context-aware acceptance criteria.</p>
                    </div>

                    {/* File Upload */}
                    <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                      <label className="block text-xs font-semibold text-blue-300 mb-2">📁 Upload Files</label>
                      <input 
                        type="file"
                        accept=".pdf,.doc,.docx,.txt,.mp4,.mov,.avi,.mkv,.webm,.mp3,.wav,.m4a,.csv,.xls,.xlsx,.jpg,.jpeg,.png"
                        multiple
                        onChange={handleFileUpload}
                        className="w-full text-xs text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-gradient-to-r file:from-blue-600 file:to-purple-600 file:text-white hover:file:from-blue-500 hover:file:to-purple-500 file:cursor-pointer file:transition"
                      />
                      <div className="mt-2 text-xs text-slate-400">
                        Supports: PDF, Word, Video, Audio, Images, Spreadsheets, Text
                      </div>
                    </div>

                    {/* Web Link */}
                    <div className="p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                      <button
                        onClick={addWebLink}
                        className="w-full bg-green-600 hover:bg-green-500 text-white py-2 rounded-lg font-medium transition text-sm"
                      >
                        🔗 Add Web Link
                      </button>
                    </div>

                    {/* Manual Text Entry */}
                    <div className="p-3 bg-slate-700/30 border border-slate-600/30 rounded-lg">
                      <label className="block text-xs font-semibold text-slate-300 mb-2">✍️ Manual Entry</label>
                      <input 
                        type="text"
                        value={newDocTitle}
                        onChange={(e) => setNewDocTitle(e.target.value)}
                        placeholder="Document title"
                        className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-green-500/30 focus:border-green-500 focus:outline-none text-sm mb-2"
                      />
                      <textarea 
                        value={newDocContent}
                        onChange={(e) => setNewDocContent(e.target.value)}
                        placeholder="Content..."
                        className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-green-500/30 focus:border-green-500 focus:outline-none text-sm resize-none"
                        rows="3"
                      />
                      <button 
                        onClick={addDocument}
                        className="w-full mt-2 bg-slate-600 hover:bg-slate-500 text-white py-2 rounded-lg font-medium transition text-sm"
                      >
                        Add Document
                      </button>
                    </div>

                    {knowledgeBase.length > 0 && (
                      <div className="border-t border-green-500/30 pt-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-green-300">📚 Knowledge Base ({knowledgeBase.length})</p>
                          <span className="text-xs text-slate-400">
                            {(knowledgeBase.reduce((sum, doc) => sum + (doc.fileSize || 0), 0) / 1024).toFixed(1)} KB
                          </span>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {knowledgeBase.map((doc) => (
                            <div key={doc.id} className="p-2 bg-slate-700/50 rounded-lg border border-slate-600/30 flex justify-between items-start hover:bg-slate-700/70 transition">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm">
                                    {doc.type?.includes('pdf') || doc.title?.endsWith('.pdf') ? '📄' : 
                                     doc.type?.includes('word') || doc.type?.includes('document') ? '📝' :
                                     doc.type?.includes('video') || doc.title?.match(/\.(mp4|mov|avi|mkv|webm)$/i) ? '🎥' :
                                     doc.type?.includes('audio') || doc.title?.match(/\.(mp3|wav|m4a)$/i) ? '🎵' :
                                     doc.type?.includes('image') || doc.title?.match(/\.(jpg|jpeg|png|gif)$/i) ? '🖼️' :
                                     doc.type?.includes('csv') || doc.type?.includes('spreadsheet') || doc.title?.match(/\.(csv|xls|xlsx)$/i) ? '📊' :
                                     doc.type === 'web-link' ? '🔗' : '📃'}
                                  </span>
                                  <p className="text-xs font-medium text-white truncate flex-1">{doc.title}</p>
                                </div>
                                <p className="text-xs text-slate-400 line-clamp-1">{doc.content.substring(0, 60)}...</p>
                                {doc.uploadedAt && (
                                  <p className="text-xs text-slate-500 mt-1">
                                    {new Date(doc.uploadedAt).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                              <button 
                                onClick={() => deleteDocument(doc.id)}
                                className="ml-2 p-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {showApiConfig && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl border border-orange-500/50 w-full max-w-md">
              <div className="bg-orange-900 p-6 flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">⚙️ API Config</h2>
                <button onClick={() => setShowApiConfig(false)} className="text-white hover:text-gray-200">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <button 
                  onClick={() => setUseAI(false)}
                  className={`w-full p-3 rounded-lg font-medium transition ${!useAI ? 'bg-orange-600 text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'}`}
                >
                  📊 Mock Mode
                </button>
                <button 
                  onClick={() => setUseAI(true)}
                  className={`w-full p-3 rounded-lg font-medium transition ${useAI ? 'bg-orange-600 text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'}`}
                >
                  🤖 Use LLM
                </button>

                {useAI && (
                  <div className="space-y-3">
                    <select 
                      value={selectedProvider}
                      onChange={(e) => setSelectedProvider(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-orange-500/30 focus:border-orange-500 focus:outline-none"
                    >
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic</option>
                    </select>

                    <input 
                      type="text"
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                      placeholder="Model (optional)"
                      className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-orange-500/30 focus:border-orange-500 focus:outline-none text-sm"
                    />

                    <input 
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="API Key"
                      className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-orange-500/30 focus:border-orange-500 focus:outline-none text-sm font-mono"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-purple-500/30">
            <label className="block text-sm font-semibold text-purple-300 mb-3">📝 User Request</label>
            <textarea 
              className="w-full px-4 py-3 bg-slate-700/50 text-white rounded-xl border border-slate-600/50 focus:border-purple-500 focus:outline-none resize-none"
              rows="8"
              placeholder="Describe what you need..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              maxLength={1000}
            />
            <div className="mt-3 text-xs text-slate-400 text-right">{inputText.length}/1000</div>
            
            <button 
              onClick={handleGenerate}
              disabled={loading}
              className="w-full mt-4 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition"
            >
              {loading ? (
                <>
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Generate ACs
                </>
              )}
            </button>

            <div className="mt-4 p-3 bg-slate-700/50 rounded-lg text-xs text-slate-300 space-y-1">
              <p><strong>Mode:</strong> {useAI ? '🤖 LLM API' : '📊 Mock'}</p>
              {useAI && <p><strong>Provider:</strong> {selectedProvider === 'openai' ? 'OpenAI' : 'Anthropic'}</p>}
              <p><strong>Learning:</strong> {learningData.edits.length > 0 ? `✅ ${learningData.edits.length} edits tracked` : '❌ No patterns yet'}</p>
              <p><strong>RAG:</strong> {ragEnabled ? `✅ Enabled (${knowledgeBase.length} docs)` : '❌ Disabled'}</p>
              {ragEnabled && knowledgeBase.length > 0 && (
                <p className="text-green-400">💡 AI will use your knowledge base for context</p>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            {generatedACs.length > 0 ? (
              <div className="bg-slate-800 rounded-2xl p-6 border border-purple-500/30">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-white">✨ Generated ACs ({generatedACs.length})</h2>
                  <button onClick={exportACs} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition">
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                </div>

                <div className="space-y-4">
                  {generatedACs.map((ac) => (
                    <div key={ac.id} className="bg-slate-700/50 rounded-xl border border-slate-600/50 overflow-hidden">
                      {editingAC === ac.id ? (
                        <div className="p-4 space-y-3">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-semibold text-purple-300">Editing AC</h3>
                            <div className="flex gap-2">
                              <button
                                onClick={saveEditAC}
                                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm transition"
                              >
                                <Save className="w-4 h-4" />
                                Save
                              </button>
                              <button
                                onClick={cancelEditAC}
                                className="flex items-center gap-1 px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm transition"
                              >
                                <X className="w-4 h-4" />
                                Cancel
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">Feature Area</label>
                            <input
                              type="text"
                              value={editedAC.featureArea}
                              onChange={(e) => setEditedAC({ ...editedAC, featureArea: e.target.value })}
                              className="w-full px-3 py-2 bg-slate-600 text-white rounded-lg border border-slate-500 focus:border-purple-500 focus:outline-none text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">User Story</label>
                            <textarea
                              value={editedAC.userStory}
                              onChange={(e) => setEditedAC({ ...editedAC, userStory: e.target.value })}
                              className="w-full px-3 py-2 bg-slate-600 text-white rounded-lg border border-slate-500 focus:border-purple-500 focus:outline-none text-sm resize-none"
                              rows="2"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">Priority</label>
                            <select
                              value={editedAC.priority}
                              onChange={(e) => setEditedAC({ ...editedAC, priority: e.target.value })}
                              className="w-full px-3 py-2 bg-slate-600 text-white rounded-lg border border-slate-500 focus:border-purple-500 focus:outline-none text-sm"
                            >
                              <option value="High">High</option>
                              <option value="Medium">Medium</option>
                              <option value="Low">Low</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-2">Acceptance Criteria</label>
                            {editedAC.criteria.map((criterion, idx) => (
                              <div key={idx} className="flex gap-2 mb-2">
                                <input
                                  type="text"
                                  value={criterion}
                                  onChange={(e) => {
                                    const newCriteria = [...editedAC.criteria];
                                    newCriteria[idx] = e.target.value;
                                    setEditedAC({ ...editedAC, criteria: newCriteria });
                                  }}
                                  className="flex-1 px-3 py-2 bg-slate-600 text-white rounded-lg border border-slate-500 focus:border-purple-500 focus:outline-none text-sm"
                                />
                                <button
                                  onClick={() => {
                                    const newCriteria = editedAC.criteria.filter((_, i) => i !== idx);
                                    setEditedAC({ ...editedAC, criteria: newCriteria });
                                  }}
                                  className="px-2 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                            <button
                              onClick={() => {
                                setEditedAC({ ...editedAC, criteria: [...editedAC.criteria, 'New criterion'] });
                              }}
                              className="w-full px-3 py-2 bg-slate-600 hover:bg-slate-500 text-slate-300 rounded-lg text-sm transition border border-dashed border-slate-500"
                            >
                              + Add Criterion
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 mr-4">
                              <h3 className="text-lg font-semibold text-white mb-2">{ac.featureArea}</h3>
                              <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                ac.priority === 'High' ? 'bg-red-900/50 text-red-200' : 
                                ac.priority === 'Medium' ? 'bg-yellow-900/50 text-yellow-200' :
                                'bg-blue-900/50 text-blue-200'
                              }`}>
                                {ac.priority} Priority
                              </span>
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                              <button
                                onClick={() => startEditAC(ac)}
                                className="flex items-center gap-1 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition text-sm font-medium"
                                title="Edit AC"
                              >
                                <Edit2 className="w-4 h-4" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => duplicateAC(ac)}
                                className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
                                title="Duplicate"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteAC(ac.id)}
                                className="p-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-slate-300 mb-3 bg-slate-800/50 p-3 rounded">{ac.userStory}</p>
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-slate-400 mb-2">ACCEPTANCE CRITERIA:</p>
                            {ac.criteria.map((criterion, idx) => (
                              <div key={idx} className="text-sm text-slate-200 flex gap-2 bg-slate-800/30 p-2 rounded">
                                <span className="text-green-400 font-bold">{idx + 1}.</span>
                                <span>{criterion}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-slate-800 rounded-2xl p-12 border border-purple-500/30 text-center h-full flex flex-col items-center justify-center">
                <p className="text-slate-300 text-lg">Ready to generate?</p>
                <p className="text-slate-500 text-sm mt-2">Enter a request and click "Generate ACs"</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ACGenerator;