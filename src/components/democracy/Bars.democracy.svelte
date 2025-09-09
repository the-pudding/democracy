<script>
	let { year, month, containerWidth, containerHeight } = $props();
	const maxDenominator = 0.3;
	import volume from "$data/volume.json"
</script>
<div class="barContainer">
	<div class="topNumber">1873</div>
	<div class="bottomNumber">2025</div>
	{#each Object.entries(volume) as [key, v]}
	  {#if year >= Number(key)}
	  {@const barWidth = year == Number(key) ? (v.total/maxDenominator*100*month/12) : (v.total/maxDenominator*100)}
	  <div class="volumeContainer" style="top: {30 + (Number(key) - 1873) / 152 * (containerHeight - 60)}px;">
	    <div class="volumeBar" style="width: {barWidth}%;">
	    	<div class="tooltip" class:visible={Number(key) == year} class:top={Number(key) > 1950} class:bottom={Number(key) <= 1950}>
	      <!-- {key}:  -->
			{(year === Number(key) ? (v.total * month / 12) : (v.total)).toFixed(1)}%
	      <!-- of speeches -->
	    </div>
	    </div>
	    
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
		right: 0px;
	}
	.topNumber {
		top: 2px;
	}
	.bottomNumber {
		bottom: 2px;
	}
	.volumeContainer {
		position: absolute;
		width: 100%;
		height:  0.5%;
		cursor: pointer;
	}
	.volumeBar {
		height: 100%;
		background: var(--color-bar);
		position: absolute;
		right: 0;
		transition: all 100ms cubic-bezier(0.420, 0.000, 0.580, 1.000); /* ease-in-out */
		transition-timing-function: cubic-bezier(0.420, 0.000, 0.580, 1.000); /* ease-in-out */
	}
	.tooltip {
		position: absolute;
		width: 200px;
		right: calc(100% + 5px);
		top: calc(-50% - 4px);
		text-align: right;
		font-size: 12px;
		display: none;
		color: var(--color-bar);
		text-shadow: -1px -1px 0 var(--barBg), 1px -1px 0 var(--barBg), -1px 1px 0 var(--barBg), 1px 1px 0 var(--barBg);
	}
	.volumeContainer:hover {
		background: rgba(0,0,0,0.1);
	}
	.volumeContainer:hover .tooltip, .tooltip.visible {
		display: block;
	}
</style>