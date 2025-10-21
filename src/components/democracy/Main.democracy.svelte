<script>
	import { onMount, onDestroy, tick } from "svelte";
	import { fade } from "svelte/transition";
	import Scrolly from "$components/helpers/Scrolly.svelte";
	import Dots from "$components/democracy/Dots.democracy.svelte";
	import Headshot from "$components/democracy/Headshot.democracy.svelte";
	import Text from "$components/democracy/Text.democracy.svelte";
	import data from "$data/speeches_cleaned_2.json";
	import {
		processText,
		convertChamber
	} from "$components/helpers/textUtils.js";

	let loading = $state(true);
	let prefersReducedMotion = $state(false);

	// Props
	let { copy } = $props();
	const heightRatio = 0.65;
	const chartToggleYear = 1970;

	// Component State
	let value = $state(0);
	let scrollProgress = $state(0);
	let lastScrollY = $state(0);
	let containerWidth = $state(0);
	let containerHeight = $state(0);
	let transcriptWidth = $state(0);
	let transcriptHeight = $state(0);
	let stepElements = [];
	const triggerPoint = 50;
	let mounted = $state(false);
	let scrollyReady = $state(false);
	let expanded = $state(false);
	let barChart = $state(true);
	const categories = {
		none: "Any threat",
		threat_policy: "Policy/practices threat",
		threat_external: "External threat",
		threat_internal: "Government threat"
	};
	let selectedCategory = $state("none");

	// State for selected speech from dot click
	let selectedSpeech = $state(null);

	let mergedData = $state({});
	let stepIndices = $state([]);

	// ADDED: State for navigation map
	let validStepNavMap = $state({});

	function getLineLength() {
		if (typeof window === "undefined") return 80;
		const width = window.innerWidth;
		if (width <= 370) return 40;
		if (width <= 470) return 45;
		if (width <= 550) return 55;
		if (width <= 700) return 65;
		if (width <= 1000) return 70;
		if (width <= 1200) return 70;
		return 80;
	}

	let lineLength = $state(getLineLength());

	// Handle dot clicks to find and display a speech
	function handleDotClick(dotData) {
		const myObject = data[dotData.year];
		const randomValue = myObject[Object.keys(myObject)[Math.floor(Math.random() * Object.keys(myObject).length)]];
		selectedSpeech = randomValue;
	}

	// Process data immediately (not in onMount)
	function processAllData() {
		// ... (existing processAllData function, no changes needed here) ...
		const allEntries = [];

		// 1. Process all speeches from the main data file
		for (const yearStr in data) {
			if (yearStr === "2026") continue;
			for (const monthStr in data[yearStr]) {
				const speech = data[yearStr][monthStr];
				allEntries.push({
					...speech,
					year: parseInt(yearStr),
					month: parseInt(monthStr),
					isStory: false
				});
			}
		}

		// 2. Process all stories from the copy file
		if (copy?.story) {
			for (const storyItem of copy.story) {
				const entry = {
					...storyItem,
					year: parseInt(storyItem.year),
					month: parseInt(storyItem.month),
					isStory: true,
					story: true,
					bigText: false
				};
				if (storyItem.bigText == "yes") {
					entry.bigText = true;
				}
				if (storyItem.quote) {
					entry.text = storyItem.quote;
					entry.storyText = storyItem.text;
				} else {
					entry.storyText = storyItem.text;
				}
				allEntries.push(entry);
			}
		}

		// 3. Sort all entries chronologically
		allEntries.sort((a, b) => {
			if (a.year !== b.year) return a.year - b.year;
			return a.month - b.month;
		});

		// 4. Pre-calculate the "sticky" category state for each step
		let lastSeenCategory = "none";
		allEntries.forEach((entry) => {
			if (entry.selectedCategory) {
				lastSeenCategory = entry.selectedCategory;
			}
			entry.stickyCategory = lastSeenCategory;
		});

		// 5. Prepend the title card
		allEntries.unshift({
			year: 1870,
			month: 1,
			day: 1,
			story: true,
			header: 1,
			text: "",
			stickyCategory: "none"
		});

		// 7. Build the final index-keyed data structures
		const finalMergedData = {};
		const finalStepIndices = [];

		allEntries.forEach((entry, index) => {
			finalMergedData[index] = entry;
			finalStepIndices.push({
				year: entry.year,
				month: entry.month,
				stepIndex: index
			});
		});

		return { finalMergedData, finalStepIndices };
	}

	// Process data immediately when component initializes
	const processedData = processAllData();
	mergedData = processedData.finalMergedData;
	stepIndices = processedData.finalStepIndices;

	// ADDED: Function to calculate the navigation map for valid text steps
	function calculateValidStepNav() {
		const navMap = {};
		let lastValidIndex = null;

		for (let i = 0; i < stepIndices.length; i++) {
			const step = stepIndices[i];
			const rowData = mergedData[step.stepIndex];

			// This is the same condition used in the markup to render the <Text> component
			const isTextStep =
				rowData?.story &&
				rowData?.header != "yes" &&
				step.year > 1870 &&
				rowData?.storyText != "";

			if (isTextStep) {
				// This is a valid step. Create its entry.
				navMap[i] = { prev: lastValidIndex, next: null };

				// If there was a previous valid step, update its 'next' pointer
				if (lastValidIndex !== null) {
					navMap[lastValidIndex].next = i;
				}

				// This is now the new 'last valid step'
				lastValidIndex = i;
			}
		}
		return navMap;
	}

	// ADDED: Call the function to populate the map
	validStepNavMap = calculateValidStepNav();

	// ADDED: Function to instantly scroll to a specific step
	function scrollToStep(index) {
		if (index !== null && stepElements[index]) {
			// scrollIntoView with 'auto' behavior is instant
			stepElements[index].scrollIntoView({ behavior: 'smooth', block: 'end' });
		}
	}

	// These derived values use the unique step index for lookups
	const currentStepIndex = $derived(Math.floor(value ?? 0));
	// ... (rest of derived values) ...
	const currentRow = $derived(mergedData?.[currentStepIndex]);
	const displayRow = $derived(selectedSpeech || currentRow);
	const year = $derived(currentRow?.year);
	const month = $derived(currentRow?.month);
	const currentAnnotation = $derived(
		copy.annotations.find((d) => year >= d.start && year <= d.end) || ""
	);

	const storyText = $derived(
		processText(
			displayRow?.text || "",
			lineLength,
			displayRow?.header || "",
			displayRow?.story
		)
	);
	const showStoryElements = $derived(currentRow?.story && value >= 0 && !selectedSpeech);

	// ... (rest of $effect blocks and onMount functions) ...
	// Clear selected speech when scrolling
	$effect(() => {
		// Clear selected speech when the value (scroll position) changes
		if (value !== undefined) {
			selectedSpeech = null;
		}
	});

	// This effect now efficiently reads the pre-calculated category for the current step
	$effect(() => {
		if (currentRow?.stickyCategory) {
			selectedCategory = currentRow.stickyCategory;
		}
	});

	$effect(() => {
		if (year > chartToggleYear) {
			barChart = false;
		} else {
			barChart = true;
		}
	});

	// Handle motion preferences
	onMount(() => {
		const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

		function updatePreference(e) {
			prefersReducedMotion = e.matches;
		}

		mediaQuery.addListener(updatePreference);
		prefersReducedMotion = mediaQuery.matches;

		return () => {
			mediaQuery.removeListener(updatePreference);
		};
	});

	// Main mount function - now only handles browser-specific operations
	onMount(() => {
		// Store initial scroll position before doing anything
		const initialScrollY = window.scrollY;

		// Set mounted flag
		mounted = true;

		// Use double requestAnimationFrame to ensure browser has finished scroll restoration
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				// Now initialize Scrolly
				scrollyReady = true;

				// Restore the scroll position if needed
				if (initialScrollY > 0) {
					window.scrollTo(0, initialScrollY);
				}

				// Store last scroll position
				lastScrollY = window.scrollY;

				// Set up resize handler
				const handleResize = () => {
					lineLength = getLineLength();
				};
				window.addEventListener("resize", handleResize);

				// Set up mutation observer for prompt headers
				const observer = new MutationObserver(() => {
					document.querySelectorAll(".promptHeader").forEach((header) => {
						if (!header.hasAttribute("data-click-bound")) {
							header.setAttribute("data-click-bound", "true");
							header.addEventListener("click", function () {
								const prompt = this.closest("p").nextElementSibling;
								if (prompt && prompt.classList.contains("prompt")) {
									prompt.classList.toggle("hidden");
									this.classList.toggle("open");
								}
							});
						}
					});
				});
				observer.observe(document.body, { childList: true, subtree: true });

				// Return cleanup function
				return () => {
					window.removeEventListener("resize", handleResize);
					observer.disconnect();
				};
			});
		});
	});

	function handleScroll() {
		// ... (existing handleScroll function, no changes needed) ...
		if (!stepElements.length || currentStepIndex === undefined) return;
		const currentScrollY = window.scrollY;
		const scrollDirection = currentScrollY > lastScrollY ? "down" : "up";
		lastScrollY = currentScrollY;
		const currentStepElement = stepElements[currentStepIndex];
		if (!currentStepElement) return;
		const rect = currentStepElement.getBoundingClientRect();
		const nextStepElement = stepElements[currentStepIndex + 1];
		let scrollDuration;
		if (nextStepElement) {
			const nextRect = nextStepElement.getBoundingClientRect();
			scrollDuration = nextRect.top - rect.top;
		} else {
			scrollDuration = window.innerHeight;
		}
		if (scrollDuration <= 0) {
			scrollDuration = window.innerHeight;
		}
		const distanceScrolled = triggerPoint - rect.top;
		const rawProgress = (distanceScrolled / scrollDuration) * 100;
		if (
			scrollDirection === "down" &&
			rawProgress < scrollProgress &&
			scrollProgress < 100
		) {
			return;
		}
		if (
			scrollDirection === "up" &&
			rawProgress > scrollProgress &&
			scrollProgress > 0
		) {
			return;
		}
		scrollProgress = Math.round(Math.max(0, Math.min(100, rawProgress)));
	}

	function handleExpand(expand) {
		if (expand) {
			expanded = true;
		} else {
			expanded = false;
		}
	}
</script>

<svelte:window on:scroll={handleScroll} />

<section id="scrolly">
	<div
		class="visualContainer"
		class:annotate={currentRow?.annotate}
		class:story={showStoryElements}
		bind:clientWidth={containerWidth}
		bind:clientHeight={containerHeight}
	>
		{#if loading}
			<div class="loading" transition:fade>Loading...</div>
		{/if}
		{#if mounted && currentRow && containerWidth > 0}
			<Dots
				{year}
				{month}
				{containerWidth}
				{containerHeight}
				{currentRow}
				{transcriptWidth}
				{transcriptHeight}
				{heightRatio}
				{selectedCategory}
				{barChart}
				{prefersReducedMotion}
				{loading}
				onUpdate={(newLoading) => (loading = newLoading)}
				onDotClick={handleDotClick}
			/>
			{#if year < 1880}
				<div class="headline_container" transition:fade>
					<h1>
						<span class="pretitle">in pursuit of</span>
						<span class="dem">democracy</span>
					</h1>
					<div class="byline">
						by <a href="https://pudding.cool/author/alvin-chang/">alvin chang</a
						>
					</div>
				</div>
				<div class="scrollDownHint" transition:fade>↓</div>
			{/if}
			{#if currentAnnotation}
				<div
					class="currentAnnotation"
					style="top:{100 - heightRatio * 100}%;"
					transition:fade
				>
					{#if currentRow?.year >= 1800}
					<div class="threatLabel">Mentions of "democracy"</div>
					{/if}
					{#if currentRow?.year >= 1880 && selectedCategory != "None"}

						<div
							class="pulldown"
							style="top:{100 - heightRatio * 100}%;"
							transition:fade
						>
							<select bind:value={selectedCategory}>
								{#each Object.entries(categories) as [key, value]}
									<option value={key}>{value}</option>
								{/each}
							</select>
							<div class="dot"></div>
						</div>
						{#if year > chartToggleYear}
							<div class="toggle" transition:fade>
								<button
									class:active={barChart}
									on:click={() => (barChart = true)}
								>
									No. of speeches
								</button>
								<button
									class:active={!barChart}
									on:click={() => (barChart = false)}
								>
									Pct. of all speeches
								</button>
							</div>
						{/if}
					{/if}
				</div>
			{/if}
		{/if}

		{#if showStoryElements && currentRow?.context && year < 2026}
			<div class="context">{currentRow.context}</div>
		{/if}
		{#if year >= 1870}
			<div class="transcriptText text-layout-container" transition:fade>
				{#if selectedSpeech}
					<div
						class="instanceData"
						style:opacity={1}
						transition:fade
					>
						{selectedSpeech.month} / {selectedSpeech.day} / {selectedSpeech.year}
						<br />
						{convertChamber(selectedSpeech.chamber)}
						{selectedSpeech.firstname}
						{selectedSpeech.lastname}
						{#if selectedSpeech.party?.[0]}
							({selectedSpeech.party[0]}-{selectedSpeech.state})
						{:else if selectedSpeech.party}
							({selectedSpeech.party}-{selectedSpeech.state})
						{/if}
					</div>

					{#if storyText.democracyRow && selectedSpeech.firstname}
						<div
							class="democracy-row-container"
							bind:clientWidth={transcriptWidth}
							bind:clientHeight={transcriptHeight}
							transition:fade={{ duration: 200 }}
						>
							{@html storyText.democracyRow}
						</div>
					{/if}
				{:else if currentRow}
					{#if currentRow.annotate}
						<div class="instanceData bigDecade">{currentRow.decades}</div>
					{:else if currentRow.month && year < 2026}
						<div
							class="instanceData"
							style:opacity={year > 1872 ? 1 : 0}
							transition:fade
						>
							{currentRow.display_month || currentRow.month} / {currentRow.day} /
							{currentRow.year}
							<br />
							{convertChamber(currentRow.chamber)}
							{currentRow.firstname}
							{currentRow.lastname}
							{#if currentRow.party?.[0]}
								({currentRow.party[0]}-{currentRow.state})
							{/if}
						</div>
					{/if}

					{#if (storyText.democracyRow || currentRow?.header == "yes") && currentRow?.firstname}
						{#key currentRow?.header}
							<div
								class="democracy-row-container"
								bind:clientWidth={transcriptWidth}
								bind:clientHeight={transcriptHeight}
								transition:fade={{ duration: 200 }}
							>
								{#if currentRow?.quote && currentRow?.headshot != "no"}
									<div class="speakerImage" in:fade>
										<Headshot
											name={currentRow.firstname + "_" + currentRow.lastname}
										/>
									</div>
								{/if}
								{@html storyText.democracyRow}
							</div>
						{/key}
					{/if}
				{:else if year < 2026}
					<div
						class="instanceData"
						style:opacity={year > 1872 ? 0.5 : 0}
						transition:fade
					>
						{month} / {year}
					</div>
				{/if}
			</div>
		{/if}
	</div>

	{#if scrollyReady && stepIndices.length > 0}
		<Scrolly bind:value top={containerHeight / 1.5}>
			{#each stepIndices as step, i}
				{@const rowData = mergedData[step.stepIndex]}
				{@const isActive = i === value}
				<div
					class="step"
					class:active={isActive}
					class:story={rowData?.story || step.story}
					class:last={rowData?.year == 2026}
					class:bigText={rowData?.bigText}
					bind:this={stepElements[i]}
				>
					{#if rowData?.story && rowData?.header != "yes" && step.year > 1870 && rowData?.storyText != ""}
						{@const nav = validStepNavMap[i]}
						<div class="textContainer">
							<Text copy={rowData?.storyText} />


							{#if nav}
								<div class="step-nav">

									{#if nav.prev !== null}
										<button
											class="step-nav-btn prev"
											on:click={() => scrollToStep(nav.prev)}
										>
											&larr;
										</button>
									{/if}
									{#if nav.next !== null}
										<button
											class="step-nav-btn next"
											on:click={() => scrollToStep(nav.next)}
										>
											{#if nav.prev !== null}
											&rarr;
											{:else}
											Skip to next &rarr;
											{/if}
										</button>
									{/if}
								</div>
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		</Scrolly>
	{:else if stepIndices.length > 0}
		<div class="steps-placeholder">
			{#each stepIndices as step, i}
				{@const rowData = mergedData[step.stepIndex]}
				<div
					class="step placeholder"
					class:story={rowData?.story || step.story}
					class:last={rowData?.year == 2026}
				>
					{#if rowData?.story && rowData?.header != "yes" && step.year > 1870 && rowData?.storyText != ""}
						<Text copy={rowData?.storyText} />
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</section>
<div class="methodology">
	<h3>Data and methods</h3>
	<Text copy={copy.methodology} />
</div>

<style>
	/* ADDED: Styles for step navigation */
	.step {
		/* This is required for absolute positioning of the nav buttons */
		position: relative;
	}
	.step-nav {
		font-family: var(--mono) !important;
		position: relative;
		/* Position at the bottom of the step viewport */
		z-index: 10;
		text-align: right;
		margin: 30px 0 10px;
		font-size: 14px;
		color: var(--onedegree-color);
	}
	button.step-nav-btn {
		background: none;
		border: 1px solid var(--onedegree-color);
		/* color: white; */
		padding: 10px 15px;
		cursor: pointer;
		border-radius: 4px;
		color: var(--onedegree-color);;
		font-family: var(--mono);
	}
	.step-nav-btn:hover {
		border: 1px solid rgba(255, 255, 255, 1);
		color: white;
	}
/* 	.step-nav-btn.next {
		position: absolute;
		right: 0px;
	} */
	/* END ADDED: Styles */

	.visualContainer,
	.text-layout-container,
	.prologue-container,
	.democracy-row-container,
	.epilogue-container {
		box-sizing: border-box;
	}
	.bars-container {
		opacity: 0;
		transition: opacity 500ms cubic-bezier(0.25, 0.25, 0.75, 0.75);
		display: block;
	}
	.toggle {
		position: absolute;
		top: calc(100% + 10px);
		left: 0px;
		z-index: 99;
		font-size: 13px;
		font-family: var(--mono);
	}
	.toggle button {
		font-family: var(--mono);
		background: var(--twodegree-color);
		color: rgba(255, 255, 255, 0.4);
		cursor: pointer;
		border: none;
		padding: 8px 12px;
	}
	.toggle button:hover {
		opacity: 0.9;
	}
	.toggle button.active {
		color: white;
		background: #66144c;
	}
	.progressBar {
		position: absolute;
		height: 10px;
		top: 0;
		left: 0;
		background-color: var(--color-progress);
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
	.democracy-row-container {
		position: absolute;
		left: 0;
		width: 100%;
		bottom: 79%;
		transform: translateY(50%);
		text-shadow: 2px 2px 2px var(--color-bg);
		background: rgb(from var(--color-bg) r g b / 0.2);
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
	.story .prologue-container,
	.story .epilogue-container {
		color: var(--democracy-row-color);
	}
	@keyframes bounce {
		0%,
		20%,
		50%,
		80%,
		100% {
			transform: translateX(-50%) translateY(0);
		}
		40% {
			transform: translateX(-50%) translateY(-35px);
		}
		60% {
			transform: translateX(-50%) translateY(-20px);
		}
	}
	.scrollDownHint {
		position: absolute;
		color: var(--democracy-row-color);
		top: 50%;
		font-size: 20px;
		left: 50%;
		transform: translateX(-50%);
		animation-name: bounce;
		animation-duration: 2.5s;
		animation-iteration-count: infinite;
		animation-timing-function: ease-in-out;
	}
	.loading {
		position: absolute;
		left: 50%;
		top: 30%;
		transform: translate(-50%, -50%);
		color: white;
		z-index: 9999999;
		animation: fadeIn 0.5s 1s forwards;
		opacity: 0;
	}
	@keyframes fadeIn {
		to {
			opacity: 1;
		}
	}
	.steps-placeholder {
		position: relative;
	}

	.step.placeholder {
		/* Match your regular step styles but without Scrolly-specific positioning */
		min-height: 100vh;
		opacity: 0;
		pointer-events: none;
	}

	/* Styles for the rest of the component */
	.visualContainer,
	.text-layout-container,
	.prologue-container,
	.democracy-row-container,
	.epilogue-container {
		box-sizing: border-box;
	}
</style>
