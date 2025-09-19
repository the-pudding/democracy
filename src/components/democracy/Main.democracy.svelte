<script>
	import { onMount } from "svelte";
	import { fade } from "svelte/transition";
	import Scrolly from "$components/helpers/Scrolly.svelte";
	import Bars from "$components/democracy/Bars.democracy.svelte";
	import Dots from "$components/democracy/Dots.democracy.svelte";
	import data from "$data/speeches.json";
	import {
		processText,
		convertChamber
	} from "$components/helpers/textUtils.js";

	// Props
	let { copy } = $props();

	// Component State
	let value = $state(0);
	let scrollProgress = $state(0);
	let lastScrollY = $state(0);
	let barVariable = $state("total_pct");
	let containerWidth = $state(0);
	let containerHeight = $state(0);
	let transcriptWidth = $state(0);
	let transcriptHeight = $state(0);
	let stepElements = [];
	const triggerPoint = 100;
	let mounted = $state(false);

	// --- REFACTORED DATA HANDLING ---
	// Initialize data structures as empty state variables.
	// They will be populated on the client-side inside onMount.
	let mergedData = $state({});
	let stepIndices = $state([]);
	// --- END REFACTOR ---

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

	// These derived values will now update reactively once mergedData and stepIndices are populated on mount.
	const currentStepIndex = $derived(Math.floor(value ?? 0));
	const currentStepData = $derived(stepIndices[currentStepIndex]);
	const year = $derived(currentStepData?.year);
	const month = $derived(currentStepData?.month);
	const currentRow = $derived(mergedData?.[year]?.[month] ?? currentStepData);

	const storyText = $derived(
		processText(currentRow?.text || "", lineLength, currentRow?.title || "")
	);
	const showStoryElements = $derived(currentRow?.story && value >= 0);

	onMount(() => {
		// --- DATA PROCESSING MOVED HERE ---
		// This logic now runs safely in the browser, preventing SSR crashes.
		const processedData = {};
		const copyLookup = new Map(
			copy?.story?.map((item) => [`${item.year}-${item.month}`, item]) || []
		);
		for (const year in data) {
			processedData[year] = {};
			for (const month in data[year]) {
				const key = `${year}-${month}`;
				if (copyLookup.has(key)) {
					processedData[year][month] = { ...copyLookup.get(key), story: true };
				} else {
					processedData[year][month] = { ...data[year][month], story: false };
				}
			}
		}
		copyLookup.forEach((item, key) => {
			const [year, month] = key.split("-");
			if (!processedData[year]?.[month]) {
				if (!processedData[year]) processedData[year] = {};
				processedData[year][month] = { ...item, story: true };
			}
		});
		mergedData = processedData; // Update state, which triggers derived values

		const processedIndices = [];
		for (const year in processedData) {
			for (const month in processedData[year]) {
				processedIndices.push({
					year: parseInt(year),
					month: parseInt(month),
				});
			}
		}
		processedIndices.sort((a, b) => {
			if (a.year !== b.year) return a.year - b.year;
			return a.month - b.month;
		});
		stepIndices = processedIndices.map((item, index) => ({
			...item,
			stepIndex: index
		})); // Update state
		// --- END DATA PROCESSING ---


		mounted = true; // Set flag to true only when in the browser
		const handleResize = () => {
			lineLength = getLineLength();
		};
		window.addEventListener("resize", handleResize);
		lastScrollY = window.scrollY;
		return () => {
			window.removeEventListener("resize", handleResize);
		};
	});

	function handleScroll() {
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

	function handleToggleClick(event) {
		barVariable = event.target.value;
	}
</script>

<svelte:window on:scroll={handleScroll} />

<section id="scrolly">
	<div
		class="visualContainer"
		class:title={currentRow?.title}
		class:annotate={currentRow?.annotate}
		class:story={showStoryElements}
		bind:clientWidth={containerWidth}
		bind:clientHeight={containerHeight}
	>
		<!-- This #if block now prevents the Dots component from running on the server at all -->
		{#if mounted && currentRow && containerWidth > 0}
			<Dots
				{year}
				{month}
				{containerWidth}
				{containerHeight}
				{barVariable}
				{currentRow}
				{transcriptWidth}
				{transcriptHeight}
			/>
		{/if}

		{#if showStoryElements}
			<div class="progressBar" style="width: {scrollProgress}%;"></div>
		{/if}
		{#if currentRow?.themes}
			<div class="debug">{currentRow.themes}</div>
		{/if}
		{#if showStoryElements && currentRow?.context}
			<div class="context">{currentRow.context}</div>
		{/if}
		<div class="transcriptText text-layout-container">
			{#if currentRow}
				{#if currentRow.annotate}
					<div class="instanceData bigDecade">{currentRow.decades}</div>
				{:else if currentRow.month}
					<div class="instanceData" style:opacity={year > 1872 ? 1 : 0}>
						{currentRow.display_month || currentRow.month} / {currentRow.day} / {currentRow.year}
						<br />
						{convertChamber(currentRow.chamber)}
						{currentRow.firstname}
						{currentRow.lastname}
						{#if currentRow.party?.[0]}
							({currentRow.party[0]}-{currentRow.state})
						{/if}
					</div>
				{/if}

				{#if storyText.democracyRow}
					<div class="democracy-row-container"
						bind:clientWidth={transcriptWidth}
						bind:clientHeight={transcriptHeight}
					>
						{@html storyText.democracyRow}
					</div>
				{/if}
			{:else}
				<div class="instanceData" style:opacity={year > 1872 ? 0.5 : 0}>
					{month} / {year}
				</div>
			{/if}
		</div>
	</div>

	<!-- By keying this block to the length of the steps, we force Scrolly to re-initialize
	     once the full list of steps has been processed on mount. -->
	{#key stepIndices.length}
		<Scrolly bind:value top={triggerPoint}>
			{#each stepIndices as step, i}
				{@const rowData = mergedData?.[step.year]?.[step.month]}
				<div
					class="step"
					class:story={rowData?.story || step.story}
					bind:this={stepElements[i]}
				></div>
			{/each}
		</Scrolly>
	{/key}
</section>

<style>
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
		bottom: 78%;
		transform: translateY(50%);
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
</style>

