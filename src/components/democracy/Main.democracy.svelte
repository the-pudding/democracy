<script>
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import Scrolly from '$components/helpers/Scrolly.svelte';
	import Bars from '$components/democracy/Bars.democracy.svelte';
	import data from '$data/speeches.json';
	// Corrected import path for your project structure
	import { processText, convertChamber } from '$components/helpers/textUtils.js';

	// Props
	let { copy } = $props();

	// Component State
	let value = $state(0);
	let scrollProgress = $state(0);
	let barVariable = $state("speeches_with_word");
	let containerWidth = $state(0);
	let containerHeight = $state(0);
	let charWidth = $state(0);
	let charMeasureRef = null;
	let stepElements = [];
	const triggerPoint = 100;

	// Constants
	const beginYear = 1872;
	const endYear = 2025;
	const yearRange = Array.from({ length: endYear - beginYear + 1 }, (_, i) => i + beginYear);
	const monthRange = Array.from({ length: 12 }, (_, i) => i + 1);

	// One-time data processing
	const mergedData = (() => {
		const merged = {};
		const copyLookup = new Map(copy?.story?.map(item => [`${item.year}-${item.month}`, item]) || []);
		for (const year in data) {
			merged[year] = {};
			for (const month in data[year]) {
				const key = `${year}-${month}`;
				if (copyLookup.has(key)) {
					merged[year][month] = { ...copyLookup.get(key), story: true };
				} else {
					merged[year][month] = { ...data[year][month], story: false };
				}
			}
		}
		copyLookup.forEach((item, key) => {
			const [year, month] = key.split('-');
			if (!merged[year]?.[month]) {
				if (!merged[year]) merged[year] = {};
				merged[year][month] = { ...item, story: true };
			}
		});
		return merged;
	})();

	const stepIndices = (() => {
		const indices = [];
		let currentIndex = 0;
		yearRange.forEach((y, yearIndex) => {
			const currentMonthRange = y === 1873 ? [1, 2, 3] : monthRange;
			currentMonthRange.forEach((m, monthIndex) => {
				indices.push({ year: y, month: m, yearIndex, monthIndex, stepIndex: currentIndex });
				currentIndex++;
			});
		});
		return indices;
	})();

	// Derived State (values computed from other state)
	const currentStepIndex = $derived(Math.floor(value));
	const currentStepData = $derived(stepIndices[currentStepIndex] || stepIndices[0]);
	const year = $derived(currentStepData.year);
	const month = $derived(currentStepData.month);
	const charsPerRow = $derived(charWidth > 0 ? Math.floor(containerWidth / charWidth) - 0.5: 0);

	// Declare state variable for the current row
	let currentRow = $state(undefined);

	$effect(() => {
	    console.log('Values updated:', {
	        lineWidth: charsPerRow,
	        charWidth,
	        containerWidth,
	        charMeasureRef: !!charMeasureRef,
	        windowWidth: window.innerWidth
	    });
	});
	// Use an effect to update currentRow when year/month change
	$effect(() => {
		const maybeRow = mergedData?.[year]?.[month];
		if (maybeRow) {
			currentRow = maybeRow;
		}
	});

	// Now declare derived values that DEPEND on currentRow
	const storyText = $derived(processText(currentRow?.text || "", charsPerRow));
	const showStoryElements = $derived((currentRow?.story || year === 1872) && value > 0);

	// Media query listeners for font size changes
	let mediaQuery700, mediaQuery900;
	
	// Lifecycle and Event Handlers
	onMount(() => {
		const measureCharWidth = () => {
			if (charMeasureRef) {
				// Get the actual text layout element to match its styling
				const textLayoutElement = document.querySelector('.transcriptText');
				if (textLayoutElement) {
					const textStyle = window.getComputedStyle(textLayoutElement);
					// Copy the exact font properties from the text layout
					charMeasureRef.style.fontSize = textStyle.fontSize;
					charMeasureRef.style.fontFamily = textStyle.fontFamily;
					charMeasureRef.style.lineHeight = textStyle.lineHeight;
					charMeasureRef.style.textRendering = textStyle.textRendering;
				}

				const rect = charMeasureRef.getBoundingClientRect();
				const measuredWidth = rect.width / 20;
				charWidth = measuredWidth;
				
				console.log('CharWidth measurement:', {
					elementWidth: rect.width,
					measuredWidth,
					containerWidth,
					charsPerRow: Math.floor(containerWidth / measuredWidth),
					windowWidth: window.innerWidth
				});
			}
		};
		
		// Initial measurement
		measureCharWidth();
		
		// Listen for window resize
		window.addEventListener('resize', measureCharWidth);
		
		// Use ResizeObserver to detect when the measurement element's font size changes
		let resizeObserver;
		if (charMeasureRef && window.ResizeObserver) {
			resizeObserver = new ResizeObserver(() => {
				measureCharWidth();
			});
			resizeObserver.observe(charMeasureRef);
		}
		
		// Also listen for media query changes to catch font size changes
		mediaQuery700 = window.matchMedia('(max-width: 700px)');
		mediaQuery900 = window.matchMedia('(max-width: 900px)');
		const handleMediaChange = () => {
			// Small delay to let CSS apply
			setTimeout(measureCharWidth, 10);
		};
		mediaQuery700.addEventListener('change', handleMediaChange);
		mediaQuery900.addEventListener('change', handleMediaChange);

		const handleScroll = () => {
			if (!stepElements.length) return;
			const currentStepElement = stepElements[currentStepIndex];
			if (currentStepElement) {
				const rect = currentStepElement.getBoundingClientRect();
				const progress = Math.max(0, Math.min(100, (triggerPoint - rect.top) / rect.height * 100));
				scrollProgress = Math.round(progress);
			}
		};
		window.addEventListener('scroll', handleScroll, { passive: true });

		return () => {
			window.removeEventListener('resize', measureCharWidth);
			window.removeEventListener('scroll', handleScroll);
			if (resizeObserver) {
				resizeObserver.disconnect();
			}
			mediaQuery700.removeEventListener('change', handleMediaChange);
			mediaQuery900.removeEventListener('change', handleMediaChange);
		};
	});

	function handleToggleClick(event) {
		barVariable = event.target.value;
	}
</script>

<div bind:this={charMeasureRef} class="char-measure" style="position: absolute; visibility: hidden; left: -9999px; white-space: pre; font-family: var(--mono); font-size: 13px; line-height: 1.4; text-rendering: geometricPrecision;">Mpdk,aS821kjSxc.asq2</div>

<section id="scrolly">
	{#if showStoryElements}
		<div class="progressBar" style="height: {scrollProgress}%;"></div>
	{/if}

	<div class="visualContainer" class:annotate={currentRow?.annotate} class:story={showStoryElements} bind:clientWidth={containerWidth} bind:clientHeight={containerHeight}>
		{#if currentRow?.themes}
			<div class="debug">{currentRow.themes}</div>
		{/if}

		{#if showStoryElements && currentRow?.context}
			<div class="context">{currentRow.context}</div>
		{/if}

		<div class=" transcriptText text-layout-container">
			{#if currentRow?.month}
				<div class="instanceData" style:opacity={year > beginYear ? 1 : 0}>
					{currentRow.display_month || currentRow.month} / {currentRow.day} / {currentRow.year}
					<br />
					{convertChamber(currentRow.chamber)} {currentRow.firstname} {currentRow.lastname}
					{#if currentRow.party?.[0]}
						({currentRow.party[0]}-{currentRow.state})
					{/if}
				</div>
			{/if}

			{#if storyText.prologue}
				<div class="prologue-container">
					{@html storyText.prologue}
				</div>
			{/if}
			{#if storyText.democracyRow}
				<div class="democracy-row-container">
					{@html storyText.democracyRow}
				</div>
			{/if}
			{#if storyText.epilogue}
				<div class="epilogue-container">
					{@html storyText.epilogue}
				</div>
			{/if}
		</div>

		<div class="bars-container" style:opacity={year > beginYear ? 1 : 0}>
			<div class="toggle">
				<button class:selected={barVariable === "total_pct"} value="total_pct" onclick={handleToggleClick}>
					% of speeches
				</button>
				<button class:selected={barVariable === "speeches_with_word"} value="speeches_with_word" onclick={handleToggleClick}>
					# of speeches
				</button>
			</div>
			<Bars {year} {month} {containerWidth} {containerHeight} {barVariable} />
		</div>
	</div>

	<Scrolly bind:value top={triggerPoint}>
		{#each stepIndices as step, i}
			{@const rowData = mergedData?.[step.year]?.[step.month]}
			<div class="step" class:story={rowData?.story || step.year === 1872} bind:this={stepElements[i]}></div>
		{/each}
	</Scrolly>
</section>

<style>
	.visualContainer, .text-layout-container, .prologue-container, .democracy-row-container, .epilogue-container {
	    box-sizing: border-box;
	}
	/* --- Your existing styles --- */
	.bars-container {
		opacity: 0;
		transition: opacity 500ms cubic-bezier(0.250, 0.250, 0.750, 0.750);
		display: block;
	}
	.toggle {
		position: absolute;
		top: 10px;
		left: 10px;
		z-index: 99;
		font-size: 14px;
		display: none;
	}
	.toggle button {
		background: #3d0d34;
		color: rgba(255, 255, 255, 0.4);
		cursor: pointer;
		border: none;
		padding: 8px 12px;
	}
	.toggle button.selected {
		color: white;
		background: purple;
	}
	.progressBar {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		background-color: rgba(0, 0, 0, 0.2);
		z-index: -1;
	}
	.debug {
		position: fixed;
		top: 0;
		right: 0px;
		width: 300px;
		z-index: 1000;
		pointer-events: none;
		font-size: 10px;
		color: #fff;
		text-align: right;
	}

	/* --- Styles for the text layout --- */
	.text-layout-container {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		font-family: var(--mono);
		line-height: 1.4;
		text-rendering: geometricPrecision;
	}
	.prologue-container,
	.democracy-row-container,
	.epilogue-container {
		/* Add this line to prevent the browser from breaking lines at hyphens */
		hyphens: none;
	}

	.democracy-row-container {
		position: absolute;
		left: 0;
		width: 100%;
		color: var(--democracy-row-color);
		bottom: 65%;
		transform: translateY(-50%);
		height: 1.4em;
	}
	.prologue-container {
		position: absolute;
		left: 0;
		width: 100%;
		overflow: hidden;
		color: var(--transcript-text-color);
		bottom: calc(65% + 2.25em);
	}
	.epilogue-container {
		position: absolute;
		left: 0;
		width: 100%;
		overflow: hidden;
		color: var(--transcript-text-color);
		top: calc(35% - 8px);
		bottom: 0;
	}
	.hl_word {
		color: var(--highlight-word-color);
		background: black;
	}
</style>