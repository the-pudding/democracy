<script>
	let {
		year,
		month,
		containerWidth,
		containerHeight,
		barVariable,
		currentRow
	} = $props();
	let chartWidth = $state(1200);
	let chartHeight = $state(500);
	import { fade } from "svelte/transition";
	// Import both decade and yearly data
	import volume from "$data/volume.json";
	import volume_year from "$data/volume_year.json";

	const mobileDivider = 190;

	const THEMES_BY_DECADE = {
		// "1870": ["electoral_integrity", "expanding_democracy", "restricting_democracy"],
		"1880": [
			"electoral_integrity",
			"expanding_democracy",
			"restricting_democracy"
		],
		"1890": ["money_in_politics"],
		"1900": ["money_in_politics"],
		"1910": ["expanding_democracy", "restricting_democracy"],
		"1920": ["expanding_democracy", "restricting_democracy"],
		"1930": ["authoritarian_threats"],
		"1940": ["authoritarian_threats"],
		"1950": ["foreign_threats"],
		"1960": ["expanding_democracy"],
		"1970": ["expanding_democracy"],
		"1980": ["expanding_democracy"],
		"1990": ["money_in_politics"],
		"2000": ["electoral_integrity", "money_in_politics"],
		"2010": [
			"expanding_democracy",
			"restricting_democracy",
			"authoritarian_threats"
		],
		"2020": ["authoritarian_threats"]
	};

	// Create a derived variable that holds the themes for the current year's decade.
	let currentDecadeThemes = $derived(() => {
		const currentDecade = Math.floor(year / 10) * 10;
		return THEMES_BY_DECADE[currentDecade.toString()] || [];
	});

	// Helper function to calculate year progress (for partial years)
	function getYearProgress(targetYear, currentYear, currentMonth) {
		if (currentYear < targetYear) return 0;
		if (currentYear > targetYear) return 1;
		if (currentYear === targetYear) {
			return currentMonth / 12;
		}
		return 1;
	}

	// Helper function to calculate highlight value.
	function getHighlightValue(volumeData, themes) {
		if (!themes || themes.length === 0) {
			return 0;
		}

		let sum = 0;
		const isPercentage = barVariable.includes("_pct");

		themes.forEach((theme) => {
			const themeKey = isPercentage ? `${theme}_pct` : theme;
			const value = volumeData[themeKey];
			if (value !== undefined) {
				sum += value;
			}
		});

		return sum;
	}

	// Calculate the maximum value displayed so far for yearly data
	function getMaxValueDisplayedYearly() {
		let maxValue = 0;
		Object.entries(volume_year).forEach(([yearKey, yearData]) => {
			const targetYear = Number(yearKey);
			if (year >= targetYear) {
				const progress = getYearProgress(targetYear, year, month);
				const currentValue = yearData[barVariable] * progress;

				if (currentValue > maxValue) {
					maxValue = currentValue;
				}
			}
		});
		return maxValue;
	}

	// Get dynamic denominator for yearly bars
	function getDynamicDenominatorYearly() {
		const maxDisplayed = getMaxValueDisplayedYearly();

		// Special handling for 1870s if needed
		if (year >= 1870 && year < 1880) {
			// Find the max value in the 1870s decade from yearly data
			let seventiesMax = 0;
			for (let y = 1870; y <= 1879; y++) {
				if (
					volume_year[y.toString()] &&
					volume_year[y.toString()][barVariable]
				) {
					seventiesMax = Math.max(
						seventiesMax,
						volume_year[y.toString()][barVariable]
					);
				}
			}
			if (maxDisplayed < seventiesMax * 0.5) {
				return seventiesMax * 1.2;
			}
		}

		// Add 20% padding so bars don't hit the top
		return maxDisplayed * 1.2;
	}

	// Find the year with the highest value so far
	function getHighestYearSoFar() {
		let maxValue = 0;
		let maxYear = null;

		Object.entries(volume_year).forEach(([yearKey, yearData]) => {
			const targetYear = Number(yearKey);
			if (year >= targetYear) {
				const progress = getYearProgress(targetYear, year, month);
				const currentValue = yearData[barVariable] * progress;

				if (currentValue > maxValue) {
					maxValue = currentValue;
					maxYear = targetYear;
				}
			}
		});
		return maxYear;
	}

	let dynamicDenominator = $derived(getDynamicDenominatorYearly());
	let highestYear = $derived(getHighestYearSoFar());

	// Helper function to get the decade start for a given year
	function getDecadeStart(year) {
		return Math.floor(year / 10) * 10;
	}

	// Helper function to get yearly data with themes
	function getYearlyDataWithThemes(yearKey, yearData) {
		const targetYear = Number(yearKey);
		const decadeStart = getDecadeStart(targetYear);
		const themes = THEMES_BY_DECADE[decadeStart.toString()] || [];
		return { yearData, themes, targetYear };
	}
</script>

<div
	class="barContainer"
	bind:clientWidth={chartWidth}
	bind:clientHeight={chartHeight}
>
	<!-- Yearly bars -->
	{#each Object.entries(volume_year) as [yearKey, yearData]}
		{@const targetYear = Number(yearKey)}
		{@const progress = getYearProgress(targetYear, year, month)}
		{#if year >= targetYear}
			{@const decadeStart = getDecadeStart(targetYear)}
			{@const yearThemes = THEMES_BY_DECADE[decadeStart.toString()] || []}
			{@const barSize =
				((yearData[barVariable] * progress) / dynamicDenominator) * 200}
			{@const highlightValue = getHighlightValue(yearData, yearThemes)}
			{@const barSizeHL =
				((highlightValue * progress) / dynamicDenominator) * 200}
			{@const tooltipValue = yearData[barVariable] * progress}
			{@const shouldShowTooltip = targetYear === highestYear}

			<!-- Desktop yearly bars -->
			<div
				class="volumeContainer desktop yearly"
				style="left: {((targetYear - 1880) / 160) *
					chartWidth}px; width: {chartWidth / 160}px;"
			>
				<div class="volumeBar yearly-bar" style="height: {barSize}%;">
					<div
						class="tooltip yearly-tooltip"
						class:visible={shouldShowTooltip}
						class:top={targetYear > 1950}
						class:bottom={targetYear <= 1950}
					>
						{barVariable === "total_pct"
							? tooltipValue.toFixed(1)
							: Math.round(tooltipValue).toLocaleString()}{barVariable ===
						"total_pct"
							? "%"
							: ""}
					</div>
				</div>
				<div
					class="volumeBarHL yearly-bar"
					style="height: {barSizeHL}%;"
					transition:fade
				></div>
			</div>

			<!-- Mobile yearly bars -->
			<div
				class="volumeContainer mobile yearly"
				style="top: {50 +
					((targetYear - 1880) / mobileDivider) *
						chartHeight}px; height: {chartHeight / mobileDivider}px;"
			>
				<div class="volumeBar yearly-bar" style="width: {barSize}%;">
					<div
						class="tooltip yearly-tooltip"
						class:visible={shouldShowTooltip}
						class:left={targetYear > 1950}
						class:right={targetYear <= 1950}
					>
						{barVariable === "total_pct"
							? tooltipValue.toFixed(1)
							: Math.round(tooltipValue).toLocaleString()}{barVariable ===
						"total_pct"
							? "%"
							: ""}
					</div>
				</div>
				<div
					class="volumeBarHL yearly-bar"
					style="width: {barSizeHL}%;"
					transition:fade
				></div>
			</div>
		{/if}
	{/each}

	<!-- Year labels every 10 years -->
	{#each [1880, 1890, 1900, 1910, 1920, 1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020] as labelYear}
		{#if year >= labelYear}
			<!-- Desktop year labels -->
			<div
				class="volumeContainer desktop decade-label"
				style="left: {((labelYear - 1880) / 160) *
					chartWidth}px; width: {chartWidth / 16}px;"
			>
				<div class="volumeDecade" transition:fade>{labelYear}</div>
			</div>

			<!-- Mobile year labels -->
			<div
				class="volumeContainer mobile decade-label"
				style="top: {50 +
					((labelYear - 1880) / mobileDivider) *
						chartHeight}px; height: {chartHeight / 16}px;"
			>
				<div class="volumeDecade" transition:fade>{labelYear}</div>
			</div>
		{/if}
	{/each}
</div>

<style>
	.topNumber,
	.bottomNumber {
		position: absolute;
		font-size: 13px;
		font-weight: bold;
		color: var(--color-bar);
		bottom: 0px;
	}
	.topNumber {
		left: 2px;
	}
	.bottomNumber {
		right: 2px;
	}

	/* Desktop styles */
	.desktop.volumeContainer {
		position: absolute;
		height: 50%;
		bottom: 20px;
		display: block;
	}

	/* Yearly container styles */
	.desktop.volumeContainer.yearly {
		width: 0.625%; /* 1/160th of the width for individual years */
	}

	/* Decade label container styles */
	.desktop.volumeContainer.decade-label {
		text-align: left;
		width: 4.5%; /* Original width for decade labels */
		pointer-events: none; /* Allow clicks to pass through to yearly bars */
	}

	.volumeBar,
	.volumeBarHL {
		transition: height 1800ms cubic-bezier(0, 1.05, 0, 0.995); /* custom */
		transition-timing-function: cubic-bezier(0, 1.05, 0, 0.995); /* custom */
	}
	.desktop .volumeBar {
		left: 5px;
		bottom: 0;
		background: var(--color-bar);
		position: absolute;
		right: 0;
	}

	.desktop .volumeBar.yearly-bar {
		width: calc(100% - 1px); /* Thinner bars for years */
		left: 0.5px;
	}

	.desktop .volumeBarHL {
		left: 5px;
		bottom: 0;
		background: var(--color-bar-hl);
		position: absolute;
		right: 0;
	}

	.desktop .volumeBarHL.yearly-bar {
		width: calc(100% - 1px); /* Thinner bars for years */
		left: 0.5px;
	}

	.desktop .volumeDecade {
		position: absolute;
		width: 100%;
		bottom: -20px;
		left: 0px;
		text-align: left;
		margin-left: -10px;
		font-size: 12px;
		color: var(--onedegree-color);
	}

	.desktop .tooltip {
		position: absolute;
		width: 100%;
		bottom: calc(100% + 5px);
		left: 0px;
		text-align: center;
		font-size: 12px;
		display: none;
		color: var(--color-tooltip);
		text-shadow:
			-1px -1px 0 var(--color-bg),
			1px -1px 0 var(--color-bg),
			-1px 1px 0 var(--color-bg),
			1px 1px 0 var(--color-bg);
	}

	.desktop .tooltip.yearly-tooltip {
		width: 40px; /* Fixed width for yearly tooltips */
		left: -15px; /* Center the tooltip */
		font-size: 10px;
	}

	/* Mobile styles */
	.mobile.volumeContainer {
		position: absolute;
		width: 45%;
		display: none;
	}

	.mobile.volumeContainer.yearly {
		height: 0.625%; /* 1/160th of the height for individual years */
	}

	.mobile.volumeContainer.decade-label {
		height: 4.5%; /* Original height for year labels */
		pointer-events: none; /* Allow clicks to pass through to yearly bars */
	}

	.mobile .volumeBar {
		left: 45px;
		background: var(--color-bar);
		position: absolute;
	}

	.mobile .volumeBar.yearly-bar {
		height: calc(100% - 0.5px); /* Thinner bars for years */
		top: 0.25px;
	}

	.mobile .volumeBarHL {
		left: 45px;
		background: var(--color-bar-hl);
		position: absolute;
	}

	.mobile .volumeBarHL.yearly-bar {
		height: calc(100% - 0.5px); /* Thinner bars for years */
		top: 0.25px;
	}

	.mobile .volumeDecade {
		position: absolute;
		width: 50px;
		top: 0px;
		left: 2px;
		text-align: left;
		font-size: 11px;
		color: var(--onedegree-color);
	}

	.mobile .tooltip {
		position: absolute;
		width: 60px;
		bottom: calc(50% - 8px);
		left: calc(100% + 3px);
		text-align: left;
		font-size: 10px;
		display: none;
		color: var(--color-tooltip);
		text-shadow:
			-1px -1px 0 var(--color-bg),
			1px -1px 0 var(--color-bg),
			-1px 1px 0 var(--color-bg),
			1px 1px 0 var(--color-bg);
	}

	.mobile .tooltip.yearly-tooltip {
		width: 40px;
		font-size: 9px;
	}

	@media (max-width: 768px) {
		.desktop.volumeContainer {
			display: none;
		}
		.mobile.volumeContainer {
			display: block;
		}
	}

	.tooltip.visible {
		display: block;
	}
</style>
