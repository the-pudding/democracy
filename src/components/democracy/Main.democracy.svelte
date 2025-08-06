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
	 * Process and merge data with copy
	*******************************/
	let mergedData = $state({});
	
	// Create a lookup map for copy data
	const copyLookup = {};
	if (copy && copy.story) {
		copy.story.forEach(item => {
			const key = `${item.year}-${item.month}`;
			copyLookup[key] = item;
		});
	}
	
	// Merge data with copy
	function createMergedData() {
		const merged = {};
		
		// First, copy all existing data
		for (const year in data) {
			merged[year] = {};
			for (const month in data[year]) {
				merged[year][month] = {
					...data[year][month],
					story: false
				};
			}
		}
		
		// Then, overlay copy data and mark as story
		for (const key in copyLookup) {
			const [year, month] = key.split('-');
			const copyItem = copyLookup[key];
			
			if (!merged[year]) {
				merged[year] = {};
			}
			
			merged[year][month] = {
				month: copyItem.month || month,
				day: copyItem.day || 1,
				year: copyItem.year || year,
				chamber: copyItem.chamber || "",
				firstname: copyItem.firstname || "",
				lastname: copyItem.lastname || "",
				party: copyItem.party || "",
				state: copyItem.state || "",
				text: copyItem.text || "",
				notable: copyItem.notable || false,
				story: true,
				...copyItem // Spread to preserve any additional properties
			};
		}
		
		return merged;
	}
	
	mergedData = createMergedData();
	
	/******************************
	 * Calculate step indices for proper scrolling
	*******************************/
	function calculateStepIndices() {
		const indices = [];
		let currentIndex = 0;
		
		yearRange.forEach((y, yearIndex) => {
			const currentMonthRange = y === 1873 ? [1, 2, 3] : monthRange;
			currentMonthRange.forEach((m, monthIndex) => {
				indices.push({
					year: y,
					month: m,
					yearIndex,
					monthIndex,
					stepIndex: currentIndex
				});
				currentIndex++;
			});
		});
		
		return indices;
	}
	
	const stepIndices = calculateStepIndices();
	
	/******************************
	 * Setting reactive variables
	*******************************/
	let value = $state(0);
	let scrollProgress = $state(0);
	let notable = $state(false);
	let currentRow = $state(undefined);
	let lastValidRow = undefined;

	let currentText = $state("");
	
	// Track scroll position within current step
	let scrollContainer;
	let stepElements = [];
	
	onMount(() => {
		const handleScroll = () => {
			if (!stepElements.length) return;
			
			const currentStepIndex = Math.floor(value);
			const currentStepElement = stepElements[currentStepIndex];
			
			if (currentStepElement) {
				const rect = currentStepElement.getBoundingClientRect();
				const windowHeight = window.innerHeight;
				const triggerPosition = triggerPoint;
				
				// Calculate how far through this step we've scrolled
				const stepTop = rect.top;
				const stepHeight = rect.height;
				const distanceFromTrigger = triggerPosition - stepTop;
				
				// Convert to percentage (0-100)
				const progress = Math.max(0, Math.min(100, (distanceFromTrigger / stepHeight) * 100));
				scrollProgress = Math.round(progress);
			}
		};
		
		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	});
	
	/******************************
	 * Scroll progress tracking
	*******************************/
	// Calculate total number of steps (now dynamic based on actual steps)
	const totalSteps = stepIndices.length;
	
	// Track trigger point (the `top` value passed to Scrolly)
	let triggerPoint = $state(100); // Try 100px from top to see the difference
	
	// The actual trigger line position is at the top of viewport + triggerPoint
	let actualTriggerPosition = $derived(triggerPoint);
	
	/******************************
	 * Text functions
	*******************************/
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

	let charsPerRow = $derived(charWidth > 0 ? Math.floor(containerWidth / charWidth) - 1 : 0);
	let totalRows = $derived(charHeight > 0 ? Math.floor(containerHeight / charHeight) : 0);
	let totalChars = $derived(charsPerRow * totalRows);

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

	function easeInOutQuad(t) {
	    // Normalize input from 0-100 to 0-1
	    const x = t / 100;
	    
	    // Quadratic ease-in-out formula
	    const eased = x < 0.5 
	        ? 2 * x * x 
	        : 1 - Math.pow(-2 * x + 2, 2) / 2;
	    
	    // Return normalized back to 0-100 range
	    return eased * 100;
	}
	
	/******************************
	 * Derived values (computed from value using step indices)
	*******************************/
	let currentStepIndex = $derived(Math.floor(value));
	let currentStepData = $derived(stepIndices[currentStepIndex] || stepIndices[0]);
	let year = $derived(currentStepData?.year || beginYear);
	let month = $derived(currentStepData?.month || 1);
	
	/******************************
	 * Reactive code
	*******************************/
	$effect(() => {
		// Use merged data instead of checking copy separately
		const maybeRow = mergedData?.[String(year)]?.[String(month)];

		if (maybeRow) {
			currentRow = maybeRow;
			lastValidRow = maybeRow;
			
			// Update democracy position when currentRow changes
			const regex = /\b(democrac(?:y|ies))\b/i;
			const match = maybeRow.text?.match(regex);
		} else {
			currentRow = lastValidRow;
		}
		
		console.log('Scroll Progress:', scrollProgress + '%', 'Step:', Math.floor(value), 'Current Value:', value, 'Year:', year, 'Month:', month);
	});
</script>

<section id="scrolly">
	<!-- Trigger line visualization (optional - remove if you don't want to see it) -->
	<div class="trigger-line" style="top: {actualTriggerPosition}px;"></div>
	<div class="visualContainer" class:notable={currentRow?.notable}>
		{#if currentRow?.story || year == 1872}
		<div class="progressBar" style="height: { easeInOutQuad(scrollProgress) }%;"></div>
		{/if}
		<div class="transcriptContainer" bind:clientWidth={containerWidth} bind:clientHeight={containerHeight}>
		{#if currentRow && currentRow.month}
		<div class="instanceData" style="opacity: {year > beginYear ? 1 : 0};">
			{currentRow["month"]} / {currentRow["day"]} / {currentRow["year"]}<br>
			{convertChamber(currentRow["chamber"])} {currentRow["firstname"]} {currentRow["lastname"]} 
			{#if currentRow["party"][0]}
			({currentRow["party"][0]}-{currentRow["state"]})
			{/if}
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
	<Scrolly bind:value top={triggerPoint}>
		{#each stepIndices as step, i}
			{@const active = value === step.stepIndex}
			{@const rowData = mergedData?.[String(step.year)]?.[String(step.month)]}
				<div 
					class="step" 
					class:story={rowData?.story || step.year == 1872} 
					class:active 
					class:pretext={step.year === 1872}
					bind:this={stepElements[i]}
				>
					<!-- {step.month}/{step.year} -->
				</div>
		{/each}
	</Scrolly>
</section>

<style>
	.bars-container, .instanceData {
		opacity:  0;
		transition: all 500ms cubic-bezier(0.250, 0.250, 0.750, 0.750);
		transition-timing-function: cubic-bezier(0.250, 0.250, 0.750, 0.750);
	}
	
	.progressBar {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		background-color: rgba(0,0,0,0.1);
		/* transition: width 0.1s ease-out; */
		z-index: 10;
	}
	
	.trigger-line {
		position: fixed;
		left: 0;
		right: 0;
		height: 2px;
		/* background-color: red; */
		z-index: 1000;
		pointer-events: none;
		opacity: 0.7;
	}
</style>