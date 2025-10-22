/**
 * Processes a block of text to create a monospaced "wall of text" grid,
 * placing the word "democracy" at a specific calculated position.
 */

function cleanText(text) {
    return text
        .replace(/\r\n|\r|\n/g, ' ')
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<!--.*?-->/g, '')
        .replace(/&#160;|\u00A0/g, ' ') // Clean pre-existing non-breaking spaces
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Maps a visual character position (ignoring HTML tags) to an actual
 * index in a string that contains HTML markup.
 */
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


export function processText(text, lineLength, title_, story) {
    if (story) {
        return { prologue: '', democracyRow: text.replace(/democracy/gi, '<span class="hl_word">$&</span>'), epilogue: '' };
    }
    const flooredLineLength = Math.floor(lineLength);
    if (!text || flooredLineLength <= 0) {
        return { prologue: '', democracyRow: '', epilogue: '' };
    }

    const cleanedText = cleanText(text);
    let match = cleanedText.match(/\b(democracy)\b/i);
    
    if (!match) {
        // Fallback for text without the keyword.
        return { prologue: '', democracyRow: cleanedText, epilogue: '' };
    }

    // --- 1. Calculate target start index for "democracy" ---
    const targetLength = Math.floor(flooredLineLength * 2 + flooredLineLength / 2 - 4);
    const ellipsis = '...';

    // --- 2. Prepare plain text blocks (NO &nbsp; padding yet) ---
    let beforeText = cleanedText.substring(0, match.index);
    let afterText = cleanedText.substring(match.index + match[0].length);
    let paddingAmount = 0;

    if (beforeText.length > targetLength) {
        beforeText = ellipsis + beforeText.substring(beforeText.length - (targetLength - ellipsis.length));
    } else {
        paddingAmount = targetLength - beforeText.length;
    }

    if (afterText.length > targetLength) {
        afterText = afterText.substring(0, targetLength - ellipsis.length) + ellipsis;
    }

    // --- 3. Combine into a single text string WITH HTML for calculations ---
    let fullTextContent = beforeText + match[0] + afterText;
    
    // --- 4. Calculate VISUAL boundaries on a plain-text version ---
    const visualText = fullTextContent.replace(/<[^>]*>/g, '');
    const visualMatchStart = visualText.indexOf(match[0]);
    const visualMatchEnd = visualMatchStart + match[0].length;
    const visualMatchCenter = visualMatchStart + Math.floor(match[0].length / 2);

    // Visual boundaries for onedegree (400 chars total)
    let oneDegreeStart = Math.max(0, visualMatchCenter - 200);
    let oneDegreeEnd = Math.min(visualText.length, visualMatchCenter + 200);

    // Visual boundaries for democracy-row (200 chars total)
    let democracyRowStart = Math.max(0, visualMatchCenter - 100);
    let democracyRowEnd = Math.min(visualText.length, visualMatchCenter + 100);

    // --- Adjust boundaries to nearest full word ---
    const findNextWordStart = (str, index) => {
        const i = str.indexOf(' ', index);
        return i === -1 ? index : i + 1;
    };
    const findPrevWordEnd = (str, index) => {
        const i = str.lastIndexOf(' ', index);
        return i === -1 ? index : i;
    };
    
    oneDegreeStart = findNextWordStart(visualText, oneDegreeStart);
    democracyRowStart = findNextWordStart(visualText, democracyRowStart);
    democracyRowEnd = findPrevWordEnd(visualText, democracyRowEnd);
    oneDegreeEnd = findPrevWordEnd(visualText, oneDegreeEnd);

    // --- Sanitize boundaries to prevent overlaps ---
    democracyRowStart = Math.min(democracyRowStart, visualMatchStart);
    democracyRowEnd = Math.max(democracyRowEnd, visualMatchEnd);
    oneDegreeStart = Math.min(oneDegreeStart, democracyRowStart);
    oneDegreeEnd = Math.max(oneDegreeEnd, democracyRowEnd);

    // --- 5. Map VISUAL boundaries to ACTUAL indices in the string with markup ---
    const actualOneDegreeStart = mapVisualToActual(fullTextContent, oneDegreeStart);
    const actualDemocracyRowStart = mapVisualToActual(fullTextContent, democracyRowStart);
    const actualMatchStart = mapVisualToActual(fullTextContent, visualMatchStart);
    const actualMatchEnd = mapVisualToActual(fullTextContent, visualMatchEnd);
    const actualDemocracyRowEnd = mapVisualToActual(fullTextContent, democracyRowEnd);
    const actualOneDegreeEnd = mapVisualToActual(fullTextContent, oneDegreeEnd);

    // --- 6. Slice the text using ACTUAL indices and reconstruct ---
    const part1 = fullTextContent.substring(0, actualOneDegreeStart);
    const part2 = fullTextContent.substring(actualOneDegreeStart, actualDemocracyRowStart);
    const part3 = fullTextContent.substring(actualDemocracyRowStart, actualMatchStart);
    const part4 = fullTextContent.substring(actualMatchStart, actualMatchEnd);
    const part5 = fullTextContent.substring(actualMatchEnd, actualDemocracyRowEnd);
    const part6 = fullTextContent.substring(actualDemocracyRowEnd, actualOneDegreeEnd);
    const part7 = fullTextContent.substring(actualOneDegreeEnd);

    // --- 7. Assemble the final HTML, adding the &nbsp; padding now ---
    const padding = '&nbsp;'.repeat(paddingAmount);

    const highlightedHtml = [
        padding, // Prepend the padding
        part1,
        `<span class="onedegree">`,
        part2,
        `<span class="democracy-row">`,
        part3,
        `<span class="hl_word">${part4}</span>`,
        part5,
        `</span>`, // end .democracy-row
        part6,
        `</span>`, // end .onedegree
        part7
    ].join('');

    return {
        prologue: '',
        democracyRow: highlightedHtml,
        epilogue: ''
    };
}

export function convertChamber(c) {
    if (c === "Senate") return "Sen.";
    if (c === "House") return "Rep.";
    return c;
}

export function convertStates(c) {
  // Return empty string for invalid input
  if (!c || typeof c !== 'string') {
    return '';
  }

  // Normalize input: trim whitespace and convert to uppercase for comparison
  const input = c.trim().toUpperCase();

  // State mapping object with all 50 states plus DC
  const states = {
    'ALABAMA': 'AL',
    'ALASKA': 'AK',
    'ARIZONA': 'AZ',
    'ARKANSAS': 'AR',
    'CALIFORNIA': 'CA',
    'COLORADO': 'CO',
    'CONNECTICUT': 'CT',
    'DELAWARE': 'DE',
    'FLORIDA': 'FL',
    'GEORGIA': 'GA',
    'HAWAII': 'HI',
    'IDAHO': 'ID',
    'ILLINOIS': 'IL',
    'INDIANA': 'IN',
    'IOWA': 'IA',
    'KANSAS': 'KS',
    'KENTUCKY': 'KY',
    'LOUISIANA': 'LA',
    'MAINE': 'ME',
    'MARYLAND': 'MD',
    'MASSACHUSETTS': 'MA',
    'MICHIGAN': 'MI',
    'MINNESOTA': 'MN',
    'MISSISSIPPI': 'MS',
    'MISSOURI': 'MO',
    'MONTANA': 'MT',
    'NEBRASKA': 'NE',
    'NEVADA': 'NV',
    'NEW HAMPSHIRE': 'NH',
    'NEW JERSEY': 'NJ',
    'NEW MEXICO': 'NM',
    'NEW YORK': 'NY',
    'NORTH CAROLINA': 'NC',
    'NORTH DAKOTA': 'ND',
    'OHIO': 'OH',
    'OKLAHOMA': 'OK',
    'OREGON': 'OR',
    'PENNSYLVANIA': 'PA',
    'RHODE ISLAND': 'RI',
    'SOUTH CAROLINA': 'SC',
    'SOUTH DAKOTA': 'SD',
    'TENNESSEE': 'TN',
    'TEXAS': 'TX',
    'UTAH': 'UT',
    'VERMONT': 'VT',
    'VIRGINIA': 'VA',
    'WASHINGTON': 'WA',
    'WEST VIRGINIA': 'WV',
    'WISCONSIN': 'WI',
    'WYOMING': 'WY',
    'DISTRICT OF COLUMBIA': 'DC',
    'D.C.': 'DC',
    'WASHINGTON D.C.': 'DC',
    'WASHINGTON DC': 'DC'
  };

  // Check if input is already a valid abbreviation
  const abbreviations = Object.values(states);
  if (input.length === 2 && abbreviations.includes(input)) {
    return input;
  }

  // Try to find the state name in the mapping
  if (states[input]) {
    return states[input];
  }

  // Return empty string if no match found
  return '';
}


