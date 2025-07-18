<script>
	import Bars from "$components/democracy/Bars.democracy.svelte";
	import Text from "$components/democracy/Text.democracy.svelte";
	import Scrolly from "$components/helpers/Scrolly.svelte";
	import { fade } from 'svelte/transition';
	import { onMount } from 'svelte';
	
	/******************************
	 * Setting constants
	*******************************/
	import data from "$data/speeches.json";
	let containerWidth = $state(0);
	let containerHeight = $state(0);
	let { copy } = $props();
	const beginYear = 1872;
	const endYear = 2025;
	
	const yearRange = Array.from({length: endYear - beginYear + 1}, (_, i) => beginYear + i);
	const monthRange = [1,2,3,4,5,6,7,8,9,10,11,12];
	
	/******************************
	 * Setting reactive variables
	*******************************/
	let value = $state(0);
	let year = $state(beginYear);
	let month = $state(1);
	let currentRow = $state(undefined);
	let lastValidRow = undefined;

	let currentText = $state("");
	
	
	/******************************
	 * Text functions
	*******************************/
	function checkCopy(m, y) {
		let final = false;
		for (let k = 0; k < copy.story.length; k++) {
			if (copy.story[k].month == m && copy.story[k].year == y) {
				final = copy.story[k];
			}
		}
		return final;
	}

	function convertChamber(c) {
		if (c == "Senate") {return "Sen."}
			if (c == "House") {return "Rep."}
		}

	/******************************
	 * Text adjustment to center
	*******************************/
	let charWidth = $state(0);
	let charHeight = $state(0);

	function getCharDimensions(fontSize, fontFamily = 'Courier New') {
	  const measurer = document.createElement('span');
	  measurer.style.font = `${fontSize}px ${fontFamily}`;
	  measurer.style.lineHeight = '1'; // Match CSS
	  measurer.style.letterSpacing = '0';
	  measurer.style.wordSpacing = '0';
	  measurer.style.fontKerning = 'none';
	  measurer.style.textRendering = 'geometricPrecision';
	  measurer.style.position = 'absolute';
	  measurer.style.visibility = 'hidden';
	  measurer.style.whiteSpace = 'pre';
	  measurer.textContent = 'M';
	  
	  document.body.appendChild(measurer);
	  const width = measurer.offsetWidth;
	  const height = measurer.offsetHeight;
	  document.body.removeChild(measurer);
	  
	  return { width, height };
	}

	onMount(() => {
		const dimensions = getCharDimensions(20);
		charWidth = dimensions.width;
		charHeight = dimensions.height * 1.2;
	});

	let charsPerRow = $derived(charWidth > 0 ? Math.floor(containerWidth / charWidth) : 0);
	let totalRows = $derived(charHeight > 0 ? Math.floor(containerHeight / charHeight) : 0);
	let totalChars = $derived(charsPerRow * totalRows);
	// let democracyPosition = $state(0);

	function mungeText(w) {
	    const regex = /\b(democrac(?:y|ies))\b/i;
	    const match = w.match(regex);
	    
	    if (!match) {
	        return w.replace(regex, '<span class="hl_word">$1</span>');
	    }
	    
	    const currentWordPosition = match.index;
	    const democracyWord = match[1];
	    
	    // Calculate target position for democracy word
	    const targetRow = Math.floor(totalRows / 4);
	    const targetCol = Math.floor(charsPerRow / 2) - Math.floor(democracyWord.length / 2) + (charsPerRow*(120/containerWidth/2));
	    const targetPosition = (targetRow * charsPerRow) + targetCol;
	    
	    let processedText;
	    let adjustedDemocracyPosition = currentWordPosition;
	    
	    if (currentWordPosition < targetPosition) {
	        const spacesToAdd = targetPosition - currentWordPosition;
	        processedText = ' '.repeat(spacesToAdd) + w;
	        adjustedDemocracyPosition = currentWordPosition + spacesToAdd;
	    } else if (currentWordPosition > targetPosition) {
	        const charsToCut = currentWordPosition - targetPosition;
	        processedText = w.substring(charsToCut);
	        adjustedDemocracyPosition = currentWordPosition - charsToCut;
	    } else {
	        processedText = w;
	    }
	    
	    // First, highlight the democracy word
	    const highlightedText = processedText.replace(/\b(democrac(?:y|ies))\b/i, '<span class="hl_word">$1</span>');
	    
	    // Find which row contains the democracy word (accounting for the added HTML tags)
	    const democracyRow = Math.floor(adjustedDemocracyPosition / charsPerRow);
	    
	    // Create rows by splitting at exact character positions, but preserve HTML tags
	    let result = '';
	    let currentRow = 0;
	    let currentCol = 0;
	    let inTag = false;
	    
	    for (let i = 0; i < highlightedText.length; i++) {
	        const char = highlightedText[i];
	        
	        // Track if we're inside an HTML tag
	        if (char === '<') {
	            inTag = true;
	        } else if (char === '>') {
	            inTag = false;
	        }
	        
	        // Only count characters towards column position if not in HTML tag
	        if (!inTag && char !== '<' && char !== '>') {
	            if (currentCol === 0) {
	                // Start of a new row - add row span if needed
	                const distance = Math.abs(currentRow - democracyRow);
	                if (currentRow === democracyRow) {
	                    result += '<span class="democracy-row">';
	                } else if (distance === 1) {
	                    result += '<span class="onedegree">';
	                } else if (distance === 2) {
	                    result += '<span class="twodegree">';
	                }
	            }
	            
	            result += char;
	            currentCol++;
	            
	            // End of row
	            if (currentCol >= charsPerRow) {
	                // Close row span if we opened one
	                const distance = Math.abs(currentRow - democracyRow);
	                if (distance <= 2) {
	                    result += '</span>';
	                }
	                result += '\n';
	                currentRow++;
	                currentCol = 0;
	            }
	        } else {
	            // HTML tag characters don't count towards column position
	            result += char;
	        }
	    }
	    
	    // Close any remaining span
	    if (currentCol > 0) {
	        const distance = Math.abs(currentRow - democracyRow);
	        if (distance <= 2) {
	            result += '</span>';
	        }
	    }
	    
	    return result;
	}
	
	/******************************
	 * Reactive code
	*******************************/
	$effect(() => {
		const yearIndex = Math.floor(value / monthRange.length);
		const monthIndex = value % monthRange.length;

		year = yearRange[yearIndex] || beginYear;
		month = monthRange[monthIndex] || 1;

		const maybeRow = data?.[String(year)]?.[String(month)];

		if (maybeRow) {
			currentRow = maybeRow;
			lastValidRow = maybeRow;
			
			// Update democracy position when currentRow changes
			const regex = /\b(democrac(?:y|ies))\b/i;
			const match = maybeRow.text.match(regex);
			// democracyPosition = match ? match.index : 0;
		} else {
			currentRow = lastValidRow;
		}
	});
</script>

<section id="scrolly">
	<div class="visualContainer">
		<div class="transcriptContainer" bind:clientWidth={containerWidth} bind:clientHeight={containerHeight}>
		{#if currentRow && currentRow.month}
		<div class="instanceData" style="opacity: {year > beginYear ? 1 : 0};">
			{currentRow["month"]} / {currentRow["day"]} / {currentRow["year"]}<br>
			{convertChamber(currentRow["chamber"])} {currentRow["firstname"]} {currentRow["lastname"]} ({currentRow["party"][0]}-{currentRow["state"]})
		</div>
		<div class="transcriptText">
			{@html mungeText(currentRow.text)}
		</div>

		{/if}
		</div>
		<div 
			class="bars-container" 
			style="opacity: {year > beginYear ? 1 : 0};"
		>
			<Bars {year} {month} {containerWidth} {containerHeight}/>
		</div>
	</div>
	<Scrolly bind:value top={100}>
		{#each yearRange as y, yearIndex}
		{#each monthRange as m, monthIndex}
		{@const currentIndex = yearIndex * monthRange.length + monthIndex}
		{@const active = value === currentIndex}
		{@const copyData = checkCopy(m, y)}
		{#if checkCopy(m, y) == false}
		<div class="step time" class:active class:pretext={y === 1872}>
			{m}/{y}
		</div>
		{:else}
		<div class="step {copyData.addclass || 'smallText'}" class:active class:pretext={y === 1872}>
			<Text copy={copyData.text}/>
		</div>
		{/if}
		{/each}
		{/each}
	</Scrolly>
</section>

<style>
	.bars-container, .instanceData {
		opacity:  0;
		transition: all 500ms cubic-bezier(0.250, 0.250, 0.750, 0.750);
		transition-timing-function: cubic-bezier(0.250, 0.250, 0.750, 0.750);
	}
</style>