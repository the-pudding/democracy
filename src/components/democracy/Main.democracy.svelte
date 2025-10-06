<script>
	import { onMount } from "svelte";
	import { fade } from "svelte/transition";
	import Scrolly from "$components/helpers/Scrolly.svelte";
	// import Bars from "$components/democracy/Bars.democracy.svelte";
	import Dots from "$components/democracy/Dots.democracy.svelte";
	import Text from "$components/democracy/Text.democracy.svelte";
	import data from "$data/speeches.json";
	import {
		processText,
		convertChamber
	} from "$components/helpers/textUtils.js";

	// Props
	let { copy } = $props();
	const heightRatio = 0.65;

	// Component State
	let value = $state(0);
	let scrollProgress = $state(0);
	let lastScrollY = $state(0);
	let containerWidth = $state(0);
	let containerHeight = $state(0);
	let transcriptWidth = $state(0);
	let transcriptHeight = $state(0);
	let stepElements = [];
	const triggerPoint = 100;
	let mounted = $state(false);
	let expanded = $state(false);
	let barChart = $state(true);
	// const categories = {
	// 	none: "None highlighted",
	// 	authoritarian_threats: "Authoritarian threats",
	// 	// electoral_integrity: "Electoral integrity",
	// 	expand_restrict: "Expand/restrict democracy",
	// 	money_in_politics: "Money in politics",
	// 	foreign_threats: "Foreign threats"
	// };
		const categories = {
		// none: "None highlighted",
		// threat_general: "Any threat",
		threat_policy: "Policy/practices threat",
		threat_external: "External threat",
		threat_internal: "Government threat",
		// threat_demographic_identity: "Demographic or identity"
	};
	let selectedCategory = $state("none");

	let mergedData = $state({});
	let stepIndices = $state([]);

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
	const currentAnnotation = $derived(
		copy.annotations.find((d) => year >= d.start && year <= d.end) || ""
	);

	const storyText = $derived(
		processText(currentRow?.text || "", lineLength, currentRow?.header || "")
	);
	const showStoryElements = $derived(currentRow?.story && value >= 0);
	$effect(() => {
		if (currentRow) {
			for (let i = 0; i < copy.story.length; i++) {
				if (
					copy.story[i].year * 12 + copy.story[i].month <=
						currentRow.year * 12 + currentRow.month &&
					copy.story[i].selectedCategory
				) {
					selectedCategory = copy.story[i].selectedCategory;
				}
			}
		}
	});
	onMount(() => {
		// --- REVISED DATA PROCESSING LOGIC ---
		const processedData = {};
		const copyLookup = new Map(
			copy?.story?.map((item) => [`${item.year}-${item.month}`, item]) || []
		);

		const finalStage = {
			month: "2",
			story: true,
			storyText: "",
			text: "",
			themes: ["threat_internal"],
			year: "2026"
		};
		data["2026"] = {
			1: finalStage,
			2: finalStage
		};

		// 1. Process direct matches and build the base data from speeches
		for (const year in data) {
			processedData[year] = {};
			for (const month in data[year]) {
				const key = `${year}-${month}`;
				const speechData = data[year][month];

				if (copyLookup.has(key)) {
					// Direct match found: merge story into the speech data
					const storyData = copyLookup.get(key);
					processedData[year][month] = {
						...speechData,
						story: true,
						storyText: storyData.text
					};
				} else {
					// No direct match: just use the speech data
					processedData[year][month] = { ...speechData, story: false };
				}
			}
		}
		// 2. Get a sorted list of all available speech dates to search against
		const speechDates = [];
		for (const year in processedData) {
			for (const month in processedData[year]) {
				speechDates.push({ year: parseInt(year), month: parseInt(month) });
			}
		}
		// Sorting isn't strictly necessary for the search, but can be useful
		speechDates.sort((a, b) => a.year - b.year || a.month - b.month);
		// for (let i = 1; i <= 12; i++) {
		// 	speechDates.push({"year": 2026, "month": i});
		// }
		// 3. Handle stories that did NOT have a direct match
		copyLookup.forEach((storyItem, key) => {
			const [year, month] = key.split("-").map(Number);

			// Check if this story was already merged in step 1. If so, skip it.
			if (processedData[year]?.[month]?.story) {
				return;
			}

			// Fallback for the "don't lose any story" rule:
			// If there are no speeches at all, create an entry for the story.
			if (speechDates.length === 0) {
				if (!processedData[year]) processedData[year] = {};
				processedData[year][month] = { ...storyItem, story: true };
				return;
			}

			// Find the nearest speech date
			let nearestDate = null;
			let minDifference = Infinity;

			for (const speechDate of speechDates) {
				// Calculate difference in months for easy comparison
				const difference = Math.abs(
					year * 12 + month - (speechDate.year * 12 + speechDate.month)
				);
				if (difference < minDifference) {
					minDifference = difference;
					nearestDate = speechDate;
				}
			}

			// Attach the story to the nearest found date
			if (nearestDate) {
				const targetObject = processedData[nearestDate.year][nearestDate.month];
				targetObject.story = true;
				targetObject.storyText = storyItem.text;
				// You could add more story properties here if needed
				// e.g., targetObject.attachedStoryTitle = storyItem.title;
			}
		});
		processedData["1870"] = {
			"1": {
				year: "1870",
				month: "1",
				day: "1",
				story: true,
				header: 1,
				text: "democracy<div class='byline'>by <a href='https://pudding.cool/author/alvin-chang/'>alvin chang</a></div>"
			}
		};
		mergedData = processedData;

		// The rest of the function remains the same...
		const processedIndices = [];
		for (const year in processedData) {
			for (const month in processedData[year]) {
				processedIndices.push({
					year: parseInt(year),
					month: parseInt(month)
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
		}));

		mounted = true;
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

	function handleExpand(expand) {
		if (expand) {
			expanded = true;
		} else {
			expanded = false;
		}
	}

	onMount(() => {
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

		return () => observer.disconnect();
	});
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
		<!-- <div class="debug">{year}</div> -->
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
			/>
			{#if year == 1870}
				<div class="scrollDownHint" transition:fade>↓</div>
			{/if}
			{#if currentAnnotation}
				<div
					class="currentAnnotation"
					style="top:{100 - heightRatio * 100}%;"
					transition:fade
				>
					<span class="annotationHeader">{currentAnnotation.header}</span>
					<div class="smallText">
						{currentAnnotation.smallText}
					</div>
					{#if currentRow?.year > 1904}
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
					{/if}
				</div>
			{/if}
		{/if}

		<!-- 		{#if showStoryElements}
			<div class="progressBar" style="width: {scrollProgress}%;"></div>
		{/if} -->
		{#if showStoryElements && currentRow?.context && year < 2026}
			<div class="context">{currentRow.context}</div>
		{/if}
		<div class="transcriptText text-layout-container">
			{#if currentRow && year < 2026}
				{#if currentRow.annotate}
					<div class="instanceData bigDecade">{currentRow.decades}</div>
				{:else if currentRow.month && year < 2026}
					<div class="instanceData" style:opacity={year > 1872 ? 1 : 0} transition:fade>
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
				{#if storyText.democracyRow || currentRow?.header == "yes"}
					<!-- {#key storyText.democracyRow} -->
						<div
							class="democracy-row-container"
							bind:clientWidth={transcriptWidth}
							bind:clientHeight={transcriptHeight}
							transition:fade
						>
							{@html storyText.democracyRow}
						</div>
					<!-- {/key} -->
				{/if}
			{:else if year < 2026}
				<div class="instanceData" style:opacity={year > 1872 ? 0.5 : 0} transition:fade>
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
					class:last={rowData?.year == 2026}
					bind:this={stepElements[i]}
				>
					{#if (i === 0 || step.year !== stepIndices[i - 1]?.year) && step.year > 1870}
						<span class="year-marker">{rowData?.year}</span>
					{:else if step.year > 1870}
						<span class="year-marker">-</span>
					{/if}
					{#if rowData?.story && currentRow?.header != "yes" && step.year > 1870}
						<Text copy={rowData?.storyText} />
					{/if}
				</div>
			{/each}
		</Scrolly>
	{/key}
</section>
<div class="methodology">
	<h3>Data and methods</h3>
	<Text copy={copy.methodology} />
</div>

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
</style>
