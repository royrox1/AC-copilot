export const FileService = {
    handleFileUpload: async (files, setKnowledgeBase, setSuccessMsg, setErrorMsg) => {
        if (!files || files.length === 0) return;

        setErrorMsg('');

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const fileType = file.type;
                const fileName = file.name;
                const fileExtension = fileName.split('.').pop().toLowerCase();

                let content = '';

                // Text files
                if (fileType === 'text/plain' || fileExtension === 'txt') {
                    content = await file.text();
                }
                // PDF files
                else if (fileType === 'application/pdf' || fileExtension === 'pdf') {
                    content = `[PDF Document: ${fileName}]\n\n${await FileService.extractTextFromPDF(file)}`;
                }
                // Word documents
                else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                    fileType === 'application/msword' ||
                    fileExtension === 'docx' || fileExtension === 'doc') {
                    content = `[Word Document: ${fileName}]\n\n${await FileService.extractTextFromWord(file)}`;
                }
                // Video files
                else if (fileType.startsWith('video/') ||
                    ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv'].includes(fileExtension)) {
                    content = `[Video: ${fileName}]\n\n${await FileService.extractMediaMetadata(file, 'video')}`;
                }
                // Audio files
                else if (fileType.startsWith('audio/') ||
                    ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(fileExtension)) {
                    content = `[Audio: ${fileName}]\n\n${await FileService.extractMediaMetadata(file, 'audio')}`;
                }
                // Image files (OCR would be needed for text extraction)
                else if (fileType.startsWith('image/') ||
                    ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileExtension)) {
                    content = `[Image: ${fileName}]\nSize: ${(file.size / 1024).toFixed(2)} KB\n\n⚠️ Image uploaded. Please manually describe the content or add relevant text.`;
                }
                // CSV/Excel files
                else if (['csv', 'xls', 'xlsx'].includes(fileExtension)) {
                    content = `[Spreadsheet: ${fileName}]\n\n${await FileService.extractSpreadsheetData(file)}`;
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
        }
    },

    extractTextFromPDF: async (file) => {
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

                        if (text.trim().length < 50) {
                            text = `PDF file: ${file.name}\nSize: ${(file.size / 1024).toFixed(2)} KB\nPages: ~${Math.ceil(file.size / 50000)}\n\n⚠️ Limited text extraction. Please manually add key content.`;
                        }
                    }

                    resolve(text.substring(0, 8000));
                } catch (err) {
                    resolve(`PDF: ${file.name} (${(file.size / 1024).toFixed(2)} KB)\n\n⚠️ Extraction failed. Please add content manually.`);
                }
            };
            reader.onerror = () => resolve(`Error reading PDF: ${file.name}`);
            reader.readAsArrayBuffer(file);
        });
    },

    extractTextFromWord: async (file) => {
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
    },

    extractMediaMetadata: async (file, type) => {
        return new Promise((resolve) => {
            const element = document.createElement(type);
            element.preload = 'metadata';

            element.onloadedmetadata = () => {
                URL.revokeObjectURL(element.src);
                const duration = Math.floor(element.duration);
                const minutes = Math.floor(duration / 60);
                const seconds = duration % 60;

                const isVideo = type === 'video';
                const resolution = isVideo ? `\nResolution: ${element.videoWidth}x${element.videoHeight}` : '';

                const metadata = `${type.charAt(0).toUpperCase() + type.slice(1)}: ${file.name}
Size: ${(file.size / (1024 * 1024)).toFixed(2)} MB
Duration: ${minutes}:${seconds.toString().padStart(2, '0')}${resolution}
Format: ${file.type}

📝 IMPORTANT: Add ${type} transcript or key points below:
- Main topics discussed:
- Key terminology:
${isVideo ? '- Important timestamps:' : '- Speaker information:\n- Important timestamps:'}

This will help RAG provide better context.`;

                resolve(metadata);
            };

            element.onerror = () => {
                resolve(`${type.charAt(0).toUpperCase() + type.slice(1)}: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)\n\n⚠️ Please add transcript or key points manually.`);
            };

            element.src = URL.createObjectURL(file);
        });
    },

    extractSpreadsheetData: async (file) => {
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
    }
};
