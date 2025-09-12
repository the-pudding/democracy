<script>
	let { year, month, containerWidth, containerHeight, barVariable } = $props();
	let chartWidth = $state(1200);
	let chartHeight = $state(500);
	import { fade } from 'svelte/transition';
	import volume from "$data/volume.json"

	const THEMES_BY_DECADE = {
		"1870": ["electoral_integrity", "expanding_democracy", "restricting_democracy"],
		"1880": ["electoral_integrity", "expanding_democracy", "restricting_democracy"],
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
		"2010": ["expanding_democracy", "restricting_democracy", "authoritarian_threats"],
		"2020": ["authoritarian_threats"],
	}
	
	// Helper function to calculate decade progress
	function getDecadeProgress(decadeStart, currentYear, currentMonth) {
		const decadeEnd = decadeStart + 9;
		if (currentYear < decadeStart) return 0;
		if (currentYear > decadeEnd) return 1;
		
		// Special case for 1870s: progress from 1873 to 1879
		if (decadeStart === 1870) {
			if (currentYear < 1873) return 0;
			if (currentYear > 1879) return 1;
			// Progress from 1873 to end of 1879 (7 years total: 1873,1874,1875,1876,1877,1878,1879)
			const totalMonths = 7 * 12; // 84 months
			const elapsedMonths = (currentYear - 1873) * 12 + (currentMonth - 1);
			return Math.min(elapsedMonths / totalMonths, 1);
		}
		
		return ((currentYear - decadeStart) * 12 + currentMonth - 1) / (10 * 12);
	}
	
	// Helper function to calculate highlight value for a decade
	function getHighlightValue(decadeStart, volumeData) {
		const themes = THEMES_BY_DECADE[decadeStart.toString()];
		if (!themes) return 0;
		
		let sum = 0;
		themes.forEach(theme => {
			if (barVariable === 'total_pct') {
				// Use the _pct version for percentage bar variable
				const themeKey = `${theme}_pct`;
				if (volumeData[themeKey] !== undefined) {
					sum += volumeData[themeKey];
				}
			} else {
				// Use the regular version for non-percentage bar variable
				if (volumeData[theme] !== undefined) {
					sum += volumeData[theme];
				}
			}
		});
		
		return sum;
	}
	
	// Calculate the maximum value displayed so far
	function getMaxValueDisplayed() {
		let maxValue = 0;
		
		Object.entries(volume).forEach(([key, v]) => {
			if (year >= Number(key)) {
				const decadeStart = Number(key);
				const progress = getDecadeProgress(decadeStart, year, month);
				const currentValue = v[barVariable] * progress;
				
				if (currentValue > maxValue) {
					maxValue = currentValue;
				}
			}
		});
		
		return maxValue;
	}
	
	// Get dynamic denominator with some padding for visual appeal
	function getDynamicDenominator() {
		const maxDisplayed = getMaxValueDisplayed();
		
		// Special case: if we're in the 1870s and no other bars are showing,
		// use the full 1870s value as denominator so we can see progress
		if (year >= 1870 && year < 1880) {
			const eighteenSeventiesFullValue = volume["1870"][barVariable];
			// If 1870s is the only/dominant bar, use its full value
			if (maxDisplayed < eighteenSeventiesFullValue * 0.5) {
				return eighteenSeventiesFullValue * 1.2;
			}
		}
		
		// Add 20% padding so bars don't hit the top
		return maxDisplayed * 1.2;
	}
	
	let dynamicDenominator = $derived(getDynamicDenominator());
</script>

<div class="barContainer" bind:clientWidth={chartWidth} bind:clientHeight={chartHeight}>
	{#each Object.entries(volume) as [key, v]}
	{@const decadeStart = Number(key)}
	{@const progress = getDecadeProgress(decadeStart, year, month)}
	{#if year >= decadeStart}
	{@const barSize = (v[barVariable] * progress / dynamicDenominator) * 200}
	{@const highlightValue = getHighlightValue(decadeStart, v)} {@const barSizeHL = (highlightValue * progress / dynamicDenominator) * 200}
	{@const tooltipValue = v[barVariable] * progress}
	{@const shouldShowTooltip = Number(key) === 2020 ? year >= 2025 : year > Number(key) + 9}
	<div class="volumeContainer desktop" style="left: {(Number(key) - 1870) / 160 * (chartWidth)}px; width: {chartWidth / 16}px;">
		<div class="volumeBar" style="height: {barSize}%;">
			<div class="tooltip" 
			class:visible={shouldShowTooltip} 
			class:top={Number(key) > 1950} 
			class:bottom={Number(key) <= 1950}>
				{barVariable === 'total_pct' ? tooltipValue.toFixed(1) : Math.round(tooltipValue).toLocaleString()}{barVariable === 'total_pct' ? '%' : ''}
			</div>
		</div>
		<div class="volumeBarHL" style="height: {barSizeHL}%;">

		</div>
		<div class="volumeDecade" transition:fade>{decadeStart}s</div>
	</div>

	<div class="volumeContainer mobile" style="top: { 50 + (Number(key) - 1870) / 190 * (chartHeight)}px; height: {chartHeight / 19}px;">
		<div class="volumeBar" style="width: {barSize}%;">
			<div class="tooltip" 
			class:visible={shouldShowTooltip} 
			class:left={Number(key) > 1950} 
			class:right={Number(key) <= 1950}>
				{barVariable === 'total_pct' ? tooltipValue.toFixed(1) : Math.round(tooltipValue).toLocaleString()}{barVariable === 'total_pct' ? '%' : ''}
			</div>
		</div>
		<div class="volumeBarHL" style="width: {barSizeHL}%;">

		</div>
		<div class="volumeDecade" transition:fade>{decadeStart}s</div>
	</div>
	{/if}
{/each}
</div>

<style>
	.topNumber, .bottomNumber {
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
	.desktop.volumeContainer {
		position: absolute;
		width: 4.5%;
		height: 50%;
		bottom: 20px;
		display: block;
	}
	.desktop .volumeBar {
		width: calc(100% - 10px);
		left: 5px;
		bottom: 0;
		background: var(--color-bar);
		position: absolute;
		right: 0;
		transition: all 100ms cubic-bezier(0.420, 0.000, 0.580, 1.000);
		transition-timing-function: cubic-bezier(0.420, 0.000, 0.580, 1.000);
	}
	.desktop .volumeBarHL {
		width: calc(100% - 10px);
		left: 5px;
		bottom: 0;
		background: var(--color-bar-hl);
		position: absolute;
		right: 0;
		transition: all 100ms cubic-bezier(0.420, 0.000, 0.580, 1.000);
		transition-timing-function: cubic-bezier(0.420, 0.000, 0.580, 1.000);
	}
	.desktop .volumeDecade {
		position: absolute;
		width: 100%;
		bottom: -20px;
		left: 0px;
		text-align: center;
		font-size: 12px;
		color:  var(--onedegree-color);
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
		text-shadow: -1px -1px 0 var(--color-bg), 1px -1px 0 var(--color-bg), -1px 1px 0 var(--color-bg), 1px 1px 0 var(--color-bg);
	}

	.mobile.volumeContainer {
		position: absolute;
		width: 45%;
		height: 4.5%;
		display: none;
	}
	.mobile .volumeBar {
		height: calc(100% - 2px);
		left: 45px;
		background: var(--color-bar);
		position: absolute;
		transition: all 100ms cubic-bezier(0.420, 0.000, 0.580, 1.000);
		transition-timing-function: cubic-bezier(0.420, 0.000, 0.580, 1.000);
	}
	.mobile .volumeBarHL {
		height: calc(100% - 2px);
		left: 45px;
		background: var(--color-bar-hl);
		position: absolute;
		transition: all 100ms cubic-bezier(0.420, 0.000, 0.580, 1.000);
		transition-timing-function: cubic-bezier(0.420, 0.000, 0.580, 1.000);
	}
	.mobile .volumeDecade {
		position: absolute;
		width: 50px;
		top: 0px;
		left: 2px;
		text-align: left;
		font-size: 11px;
		color:  var(--onedegree-color);
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
		text-shadow: -1px -1px 0 var(--color-bg), 1px -1px 0 var(--color-bg), -1px 1px 0 var(--color-bg), 1px 1px 0 var(--color-bg);
	}
	@media (max-width: 768px) {
		.desktop.volumeContainer {
			display: none;
		}
		.mobile.volumeContainer {
			display: block;
		}
	}

	
/* 	.volumeContainer:hover {
		background: rgba(0,0,0,0.1);
	} */
	/* .volumeContainer:hover .tooltip, */
	.tooltip.visible {
		display: block;
	}
</style>