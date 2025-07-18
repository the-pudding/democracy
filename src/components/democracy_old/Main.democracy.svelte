<script>
	import Image from "$components/democracy/Image.democracy.svelte";
	import Text from "$components/democracy/Text.democracy.svelte";
	import Scrolly from "$components/helpers/Scrolly.svelte";
	import { fade } from 'svelte/transition';
	
	/******************************
	 * Setting constants
	*******************************/
	import data from "$data/combined_all.json"
	let { copy } = $props();
	const beginYear = 1970;
	const endYear = 1980;
	
	const yearRange = Array.from({length: endYear - beginYear + 1}, (_, i) => beginYear + i);
	const monthRange = [1,2,3,4,5,6,7,8,9,10,11,12];
	
	/******************************
	 * Setting reactive variables
	*******************************/
	let value = $state(0);
	let year = $state(2000);
	let month = $state(1);
	
	/******************************
	 * Image picking and display
	*******************************/
	let currentImage = $state((() => {
		const currentData = data[year][month.toString().padStart(2, '0')];
		return pickRandom(currentData);
	})());
	
	let imageWidth = $state(0);
	let imageHeight = $state(0);
	let opacity = $state(0);
	let imagePosition = $state({x: 0, y: 0});
	
	function handleImageLoad(width, height) {
		imageWidth = width;
		imageHeight = height;
		// Calculate position after image loads
		imagePosition = processPosition(currentImage, 50, 20);
		// Small delay to ensure positioning is applied before visibility
		opacity = 1;
	}
	
	function pickRandom(array) {
		// console.log(array)
		const filtered = array.filter(item => item[5] === false);
		const imageIndex = Math.random();
		// const imageIndex = 0;
		return filtered[Math.floor(imageIndex * filtered.length)];
	}
	
	function processPosition(imageData, defaultPosX=50, defaultPosY=50) {
		function getPos(pos, defaultPos=50) {
			if (pos > defaultPos) {
				return (pos - defaultPos) * -1;
			}
			if (pos < defaultPos) {
				return (defaultPos - pos);
			}			
		}
		return {x: getPos(imageData[1],defaultPosX), y: getPos(imageData[2],defaultPosY)};
	}
	
	/******************************
	 * Text check
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
	
	/******************************
	 * Reactive code
	*******************************/
	$effect(() => {
		// Calculate year and month from the value index
		const yearIndex = Math.floor(value / monthRange.length);
		const monthIndex = value % monthRange.length;
		
		// Update year and month based on the calculated indices
		year = yearRange[yearIndex] || beginYear;
		month = monthRange[monthIndex] || 1;
		
		// Update image when month/year changes
		if (data[year] && data[year][month.toString().padStart(2, '0')]) {
			const currentData = data[year][month.toString().padStart(2, '0')];
			currentImage = pickRandom(currentData);
			opacity = 0; // Reset opacity for new image
		}
	});
	
	// New effect to handle image position updates when currentImage changes
	$effect(() => {
		if (currentImage && imageWidth > 0 && imageHeight > 0) {
			imagePosition = processPosition(currentImage, 50, 20);
			opacity = 1;
		}
	});
</script>

<section id="scrolly">
	<div class="visualContainer">
		<div class="instanceData">
			{month} / {year}
		</div>
		<Image 
		{currentImage}
		{imagePosition}
		{opacity}
		onImageLoad={handleImageLoad}
		/>
	</div>
	<Scrolly bind:value top={100}>
		{#each yearRange as y, yearIndex}
		{#each monthRange as m, monthIndex}
		{@const currentIndex = yearIndex * monthRange.length + monthIndex}
		{@const active = value === currentIndex}
		{@const copyData = checkCopy(m, y)}
		{#if checkCopy(m, y) == false}
		<div class="step time" class:active>
			{m} / {y}
		</div>
		{:else}
		<div class="step {copyData.addclass || 'smallText'}" class:active>
			<Text copy={copyData.text}/>
		</div>
		{/if}
		{/each}
		{/each}
	</Scrolly>
</section>

<style>
	.instanceData {
		position: absolute;
		background: black;
		top: 0;
		left: 0;
		padding: 5px;
		z-index: 10;
		color: white;
	}
</style>