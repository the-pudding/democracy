<script>
	import { fade } from 'svelte/transition';
	import data from "$data/combined_nonbound.json"
	
	function pickRandomYearMonth() {
		const years = Object.keys(data);
		let attempts = 0;
		let randomYear, availableMonths, randomMonth;
		
		// Try up to 10 times to find a valid year/month with data
		do {
			randomYear = years[Math.floor(Math.random() * years.length)];
			availableMonths = Object.keys(data[randomYear]);
			randomMonth = availableMonths[Math.floor(Math.random() * availableMonths.length)];
			attempts++;
		} while (attempts < 10 && (!data[randomYear][randomMonth] || data[randomYear][randomMonth].length === 0));
		
		// Fallback to a known working combination if all attempts fail
		if (!data[randomYear][randomMonth] || data[randomYear][randomMonth].length === 0) {
			return { year: 2000, month: 7 };
		}
		return { year: parseInt(randomYear), month: parseInt(randomMonth) };
	}
	
	function pickRandom(array) {
		const filtered = array.filter(item => item[5] === false);
		return filtered[Math.floor(Math.random() * filtered.length)];
	}
	
	// Calculate everything once at module level before any reactive state
	const initialSelection = (() => {
		const { year, month } = pickRandomYearMonth();
		const currentData = data[year][month.toString().padStart(2, '0')];
		const image = pickRandom(currentData);
		return { year, month, image };
	})();
	
	// Make these reactive so they can change on click
	let year = $state(initialSelection.year);
	let month = $state(initialSelection.month);
	let currentImage = $state(initialSelection.image);
	
	let imageElement;
	let imageWidth = $state(0);
	let imageHeight = $state(0);
	let opacity = $state(0);
	let imagePosition = $state({x: 0, y: 0});
	const hlPadding = 5;

	function handleImageLoad() {
		if (imageElement) {
			imageWidth = imageElement.clientWidth;
			imageHeight = imageElement.clientHeight;
			// Calculate position after image loads
			imagePosition = processPosition(currentImage, 50, 20);
			// Small delay to ensure positioning is applied before visibility
			setTimeout(() => {
				opacity = 1;
			}, 10);
		}
	}
	
	function loadNewImage() {
		// Hide current image
		opacity = 0;
		// Get new selection
		const newSelection = (() => {
			const { year: newYear, month: newMonth } = pickRandomYearMonth();
			const newData = data[newYear][newMonth.toString().padStart(2, '0')];
			const newImage = pickRandom(newData);
			return { year: newYear, month: newMonth, image: newImage };
		})();
		// Update state
		year = newSelection.year;
		month = newSelection.month;
		currentImage = newSelection.image;
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
</script>
<div class="outsideContainer" onclick={loadNewImage}>
	<div class="instanceData">
		{month} / {year}
	</div>
	<div class="imageContainer"
		style:left="{imagePosition.x / 100 * imageWidth}px"
		style:top="{imagePosition.y / 100 * imageHeight}px"
		style:opacity="{opacity}"
		transition:fade
	>
		<img class="page" 
		bind:this={imageElement}
		onload={handleImageLoad}
		src="assets/pages/{currentImage[0]}"
		/>
		
		<!-- Top white box -->
		<div class="whiteBox"
		style:left="0px"
		style:top="0px"
		style:width="{imageWidth}px"
		style:height="{(currentImage[2] / 100) * imageHeight - hlPadding}px"
		></div>
		
		<!-- Bottom white box -->
		<div class="whiteBox"
		style:left="0px"
		style:top="{((currentImage[2] + currentImage[4]) / 100) * imageHeight + hlPadding}px"
		style:width="{imageWidth}px"
		style:height="{imageHeight - ((currentImage[2] + currentImage[4]) / 100) * imageHeight - hlPadding}px"
		></div>
		
		<!-- Left white box -->
		<div class="whiteBox"
		style:left="0px"
		style:top="{(currentImage[2] / 100) * imageHeight - hlPadding}px"
		style:width="{(currentImage[1] / 100) * imageWidth - hlPadding}px"
		style:height="{(currentImage[4] / 100) * imageHeight + hlPadding*2}px"
		></div>
		
		<!-- Right white box -->
		<div class="whiteBox"
		style:left="{((currentImage[1] + currentImage[3]) / 100) * imageWidth + hlPadding}px"
		style:top="{(currentImage[2] / 100) * imageHeight - hlPadding}px"
		style:width="{imageWidth - ((currentImage[1] + currentImage[3]) / 100) * imageWidth - hlPadding}px"
		style:height="{(currentImage[4] / 100) * imageHeight + hlPadding*2}px"
		></div>
	</div>
</div>
<style>
.outsideContainer {
	max-width: 1200px;
	margin: 0 auto;
	width: 100%;
	display: block;
	height: 100vh;
	position: relative;
	text-align: center;
	overflow: hidden;
	border: 1px solid black;
}
.imageContainer {
	position: relative;
	width: auto;
	height: auto;
	display: inline-block;
	margin: 0 auto;
	user-select: none;
}
.imageContainer .page {
	position: relative;
	width: 1200px;
	height: auto;
	display: block;
}
.imageContainer .whiteBox {
	position: absolute;
	background: white;
	z-index: 5;
}
.instanceData {
	position: absolute;
	background: black;
	top: 0;
	left: 0;
	padding: 5px;
	z-index: 10;
	color: white;
}
.whiteBox {
	opacity: 0.9;
}
</style>