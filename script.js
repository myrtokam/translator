// Global variables
let uploadedFile = null;
let uploadedText = '';
let selectedStyle = 'professional';

// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const filePreview = document.getElementById('filePreview');
const removeFileBtn = document.getElementById('removeFile');
const translateBtn = document.getElementById('translateBtn');
const loadingSection = document.getElementById('loadingSection');
const resultsSection = document.getElementById('resultsSection');
const translatedTextDiv = document.getElementById('translatedText');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');
const newTranslationBtn = document.getElementById('newTranslationBtn');
const styleCards = document.querySelectorAll('.style-card');

// Language names mapping
const languageNames = {
    'auto': 'Auto-detect',
    'el': 'Greek',
    'en': 'English',
    'fr': 'French',
    'de': 'German',
    'es': 'Spanish',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'zh': 'Chinese',
    'ja': 'Japanese'
};

// Initialize event listeners
function init() {
    // Upload area events
    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    fileInput.addEventListener('change', handleFileSelect);
    removeFileBtn.addEventListener('click', removeFile);

    // Style selection
    styleCards.forEach(card => {
        card.addEventListener('click', () => {
            styleCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedStyle = card.dataset.style;
        });
    });

    // Set default style
    document.querySelector('[data-style="professional"]').classList.add('selected');

    // Translate button
    translateBtn.addEventListener('click', handleTranslate);

    // Result buttons
    copyBtn.addEventListener('click', copyToClipboard);
    downloadBtn.addEventListener('click', downloadTranslation);
    newTranslationBtn.addEventListener('click', resetForm);
}

// File handling functions
function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

async function processFile(file) {
    uploadedFile = file;
    const fileName = file.name;
    const fileExtension = fileName.split('.').pop().toLowerCase();

    // Show file preview
    filePreview.querySelector('.file-name').textContent = fileName;
    filePreview.classList.remove('hidden');
    uploadArea.style.display = 'none';

    // Read file content
    try {
        if (fileExtension === 'txt') {
            uploadedText = await readTextFile(file);
        } else if (fileExtension === 'pdf') {
            alert('Για PDF αρχεία, θα χρησιμοποιηθεί το Claude API που υποστηρίζει PDF ανάγνωση!');
            uploadedText = await readPDFFile(file);
        } else if (fileExtension === 'docx') {
            alert('Για DOCX αρχεία, το κείμενο θα εξαχθεί αυτόματα!');
            uploadedText = await readDocxFile(file);
        } else {
            alert('Παρακαλώ επίλεξε αρχείο TXT, PDF ή DOCX');
            removeFile();
        }
    } catch (error) {
        alert('Σφάλμα κατά την ανάγνωση του αρχείου: ' + error.message);
        removeFile();
    }
}

function readTextFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

async function readPDFFile(file) {
    // For PDF, we'll send it as base64 to Claude API
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            // Store base64 data for API
            uploadedFile.base64Data = e.target.result.split(',')[1];
            resolve('[PDF CONTENT - Will be processed by AI]');
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function readDocxFile(file) {
    // For DOCX, we'll send it as base64 to Claude API
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            uploadedFile.base64Data = e.target.result.split(',')[1];
            resolve('[DOCX CONTENT - Will be processed by AI]');
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function removeFile() {
    uploadedFile = null;
    uploadedText = '';
    filePreview.classList.add('hidden');
    uploadArea.style.display = 'block';
    fileInput.value = '';
}

// Translation function
async function handleTranslate() {
    if (!uploadedFile) {
        alert('Παρακαλώ ανέβασε πρώτα ένα αρχείο! 📄');
        return;
    }

    // Get all settings
    const sourceLang = document.getElementById('sourceLang').value;
    const targetLang = document.getElementById('targetLang').value;
    const format = document.querySelector('input[name="format"]:checked').value;
    const withExplanations = document.getElementById('withExplanations').checked;
    const deepAnalysis = document.getElementById('deepAnalysis').checked;
    const withExamples = document.getElementById('withExamples').checked;
    const literalTranslation = document.getElementById('literalTranslation').checked;
    const context = document.getElementById('context').value;

    // Show loading
    loadingSection.classList.remove('hidden');
    resultsSection.classList.add('hidden');
    translateBtn.disabled = true;

    try {
        // Call AI API for translation
        const translation = await translateWithAI({
            text: uploadedText,
            file: uploadedFile,
            sourceLang,
            targetLang,
            style: selectedStyle,
            format,
            withExplanations,
            deepAnalysis,
            withExamples,
            literalTranslation,
            context
        });

        // Show results
        translatedTextDiv.textContent = translation;
        loadingSection.classList.add('hidden');
        resultsSection.classList.remove('hidden');

        // Scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        alert('Σφάλμα κατά τη μετάφραση: ' + error.message);
        loadingSection.classList.add('hidden');
    } finally {
        translateBtn.disabled = false;
    }
}

// AI Translation using Anthropic Claude API
async function translateWithAI(options) {
    const {
        text,
        file,
        sourceLang,
        targetLang,
        style,
        format,
        withExplanations,
        deepAnalysis,
        withExamples,
        literalTranslation,
        context
    } = options;

    // Build the translation prompt
    let prompt = buildTranslationPrompt(options);

    // Prepare messages for API
    let messages = [];

    // Handle file types
    if (file && (file.name.endsWith('.pdf') || file.name.endsWith('.docx'))) {
        const mediaType = file.name.endsWith('.pdf') ? 'application/pdf' : 
                         'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        
        messages.push({
            role: 'user',
            content: [
                {
                    type: 'document',
                    source: {
                        type: 'base64',
                        media_type: mediaType,
                        data: file.base64Data
                    }
                },
                {
                    type: 'text',
                    text: prompt
                }
            ]
        });
    } else {
        messages.push({
            role: 'user',
            content: prompt
        });
    }

    // Call Anthropic API
    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 4000,
                messages: messages
            })
        });

        if (!response.ok) {
            throw new Error('API Error: ' + response.statusText);
        }

        const data = await response.json();
        
        // Extract text from response
        let translatedText = '';
        for (const item of data.content) {
            if (item.type === 'text') {
                translatedText += item.text;
            }
        }

        return translatedText || 'Δεν ήταν δυνατή η μετάφραση.';
    } catch (error) {
        console.error('Translation error:', error);
        throw new Error('Αποτυχία μετάφρασης. Παρακαλώ προσπάθησε ξανά.');
    }
}

// Build comprehensive translation prompt
function buildTranslationPrompt(options) {
    const {
        text,
        sourceLang,
        targetLang,
        style,
        format,
        withExplanations,
        deepAnalysis,
        withExamples,
        literalTranslation,
        context
    } = options;

    const sourceLangName = languageNames[sourceLang] || sourceLang;
    const targetLangName = languageNames[targetLang];

    let prompt = `You are a professional translator with expertise in multiple languages and contexts.\n\n`;

    // Language instructions
    if (sourceLang === 'auto') {
        prompt += `Please detect the source language automatically and translate to ${targetLangName}.\n\n`;
    } else {
        prompt += `Translate the following text from ${sourceLangName} to ${targetLangName}.\n\n`;
    }

    // Style instructions
    const styleInstructions = {
        'academic': 'Use academic, scholarly language with formal terminology and rigorous structure.',
        'professional': 'Use professional, business-appropriate language that is clear and competent.',
        'email': 'Format as a professional email with appropriate greeting and closing.',
        'formal': 'Use very formal, official document language suitable for legal or governmental contexts.',
        'casual': 'Use conversational, everyday language that feels natural and friendly.',
        'creative': 'Use creative, engaging language with literary flair and expressive phrasing.'
    };

    prompt += `Translation Style: ${styleInstructions[style]}\n\n`;

    // Format instructions
    const formatInstructions = {
        'paragraphs': 'Present the translation in well-structured paragraphs.',
        'letter': 'Format as a formal letter with date, greeting, body, and closing.',
        'recommendation': 'Format as a recommendation letter with proper structure.',
        'bullets': 'Format as bullet points for clarity and easy reading.'
    };

    prompt += `Format: ${formatInstructions[format]}\n\n`;

    // Context instructions
    if (context !== 'general') {
        const contextInstructions = {
            'academic': 'This is for an academic/university setting.',
            'business': 'This is for a professional business meeting.',
            'presentation': 'This is for a presentation.',
            'research': 'This is for a research paper.'
        };
        prompt += `Context: ${contextInstructions[context]}\n\n`;
    }

    // CRITICAL: Human-like translation instruction (always applied)
    prompt += `IMPORTANT: The translation MUST sound natural and human-written, as if created by a professional human translator. Avoid robotic or machine-like phrasing.\n\n`;

    // Advanced options
    if (literalTranslation) {
        prompt += `Provide a literal, word-for-word translation that stays as close to the original as possible.\n\n`;
    }

    if (withExplanations) {
        prompt += `After the translation, provide explanations of key terms, idioms, or culturally specific references in brackets.\n\n`;
    }

    if (deepAnalysis) {
        prompt += `After the translation, provide a deeper analysis of the text's meaning, context, and nuances.\n\n`;
    }

    if (withExamples) {
        prompt += `Include relevant examples to illustrate complex concepts or terminology.\n\n`;
    }

    // Add the text to translate (if it's a simple text file)
    if (text && !text.includes('[PDF CONTENT') && !text.includes('[DOCX CONTENT')) {
        prompt += `\n\nText to translate:\n${text}`;
    } else if (text.includes('[PDF CONTENT') || text.includes('[DOCX CONTENT')) {
        prompt += `\n\nPlease extract and translate all text from the uploaded document.`;
    }

    return prompt;
}

// Copy to clipboard
function copyToClipboard() {
    const text = translatedTextDiv.textContent;
    navigator.clipboard.writeText(text).then(() => {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✅';
        setTimeout(() => {
            copyBtn.textContent = originalText;
        }, 2000);
    }).catch(err => {
        alert('Αποτυχία αντιγραφής στο clipboard');
    });
}

// Download translation
function downloadTranslation() {
    const text = translatedTextDiv.textContent;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'translation_' + new Date().getTime() + '.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Reset form
function resetForm() {
    removeFile();
    resultsSection.classList.add('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
