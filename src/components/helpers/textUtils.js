/**
 * Processes a block of text to create a monospaced "wall of text" effect,
 * centering the word "democracy".
 */

function replaceSpacesExceptHTML(str) {
    return str.replace(/>[^<]*</g, match => 
        match.replace(/ /g, '&nbsp;')
    );
}

function cleanText(text) {
    return text
        .replace(/\r\n|\r|\n/g, ' ')
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<!--.*?-->/g, '')
        .replace(/&#160;|\u00A0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function getVisualLength(text) {
    return text.replace(/<[^>]*>/g, '').length;
}

function stripAllNewlines(str) {
    return str.replace(/[\r\n\u2028\u2029]/g, '').replace(/\s*\n\s*/g, ' ');
}

function mapVisualToActual(text, visualPos) {
    let actual = 0;
    let visual = 0;
    
    while (actual < text.length && visual < visualPos) {
        if (text[actual] === '<') {
            const end = text.indexOf('>', actual);
            actual = end === -1 ? actual + 1 : end + 1;
        } else {
            visual++;
            actual++;
        }
    }
    return actual;
}

export function processText(text, lineLength) {
    if (!text || lineLength <= 0) {
        return { prologue: '', democracyRow: '', epilogue: '' };
    }

    const cleanedText = cleanText(text);
    const visualText = cleanedText.replace(/<[^>]*>/g, '');
    const match = visualText.match(/\b(democracy)\b/i);
    
    if (!match) {
        return { 
            prologue: cleanedText.replace(/<[^>]*>/g, '').split(' ').join('&nbsp;'), 
            democracyRow: '', 
            epilogue: '' 
        };
    }

    const centerPos = Math.floor(lineLength / 2) - Math.floor(match[1].length / 2);
    const startPos = Math.max(0, match.index - centerPos);
    
    if (startPos <= 0) {
        const padding = Math.max(0, centerPos - match.index);
        const textEnd = Math.min(lineLength - padding, visualText.length);
        
        let actualEnd = mapVisualToActual(cleanedText, textEnd);
        // For ASCII art, don't break at word boundaries - break at exact character positions
        // if (textEnd < visualText.length && visualText[textEnd] !== ' ') {
        //     const lastSpace = visualText.lastIndexOf(' ', textEnd);
        //     if (lastSpace > 0) {
        //         actualEnd = mapVisualToActual(cleanedText, lastSpace);
        //     }
        // }
        
        const democracyText = cleanedText.substring(0, actualEnd);
        const epilogueText = cleanedText.substring(actualEnd).trim();
        
        return {
            prologue: '',
            democracyRow: replaceSpacesExceptHTML('&nbsp;'.repeat(padding) + democracyText).replace(/\b(democracy)\b/i, '<span class="hl_word">$1</span>'),
            epilogue: epilogueText.replace(/<[^>]*>/g, '').split(' ').join('&nbsp;')
        };
    }

    let endPos = startPos + lineLength;
    // For ASCII art, don't break at word boundaries - break at exact character positions
    // if (endPos < visualText.length && visualText[endPos] !== ' ') {
    //     const lastSpace = visualText.lastIndexOf(' ', endPos);
    //     if (lastSpace > startPos) {
    //         endPos = lastSpace;
    //     }
    // }

    const actualStart = mapVisualToActual(cleanedText, startPos);
    const actualEnd = mapVisualToActual(cleanedText, endPos);
    
    let prologueText = cleanedText.substring(0, actualStart);
    const democracyText = cleanedText.substring(actualStart, actualEnd);
    let epilogueText = cleanedText.substring(actualEnd).trim();

    if (startPos > 0 && visualText[startPos] !== ' ' && visualText[startPos - 1] !== ' ') {
        prologueText += '-';
    }
    
    const prologueVisual = prologueText.replace(/<[^>]*>/g, '');
    if (prologueVisual.length > 0 && /^[a-z]/.test(prologueVisual)) {
        prologueText = '... ' + prologueText;
    }
    
    const epilogueVisual = epilogueText.replace(/<[^>]*>/g, '');
    if (epilogueVisual.length > 0 && !/[.?!"]$/.test(epilogueVisual)) {
        epilogueText += ' ...';
    }

    const prologueVisualLen = getVisualLength(prologueText);
    const paddingNeeded = prologueVisualLen % lineLength;
    const padding = paddingNeeded > 0 ? lineLength - paddingNeeded : 0;
    const finalPrologue = '&nbsp;'.repeat(padding) + prologueText;

    return {
        prologue: finalPrologue.replace(/<[^>]*>/g, '').split(' ').join('&nbsp;'),
        democracyRow: replaceSpacesExceptHTML(democracyText).replace(/\b(democracy)\b/i, '<span class="hl_word">$1</span>'),
        epilogue: epilogueText.replace(/<[^>]*>/g, '').split(' ').join('&nbsp;')
    };
}

export function convertChamber(c) {
    if (c === "Senate") return "Sen.";
    if (c === "House") return "Rep.";
    return c;
}