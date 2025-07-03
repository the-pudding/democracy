<script>
	import data from "$data/combined_nonbound.json"
	let year = $state(2000);
	let month = $state(7);
	let currentData = $derived(data[year][month.toString().padStart(2, '0')]);
	let currentImage = $derived(pickRandom(currentData));
	let imageElement;
	let imageWidth = $state(0);
	let imageHeight = $state(0);
	
	function pickRandom(array) {
		const filtered = array.filter(item => item[5] === false);
		return filtered[Math.floor(Math.random() * filtered.length)];
	}
	
	function handleImageLoad() {
		if (imageElement) {
			imageWidth = imageElement.clientWidth;
			imageHeight = imageElement.clientHeight;
		}
	}
</script>
<div class="outsideContainer">
	<div class="imageContainer">
		<img class="page" 
		bind:this={imageElement}
		onload={handleImageLoad}
		src="assets/pages/{currentImage[0]}"
		/>
		<div class="highlight"
		style:left="{(currentImage[1] / 100) * imageWidth}px"
		style:top="{(currentImage[2] / 100) * imageHeight}px"
		style:width="{(currentImage[3] / 100) * imageWidth}px"
		style:height="{(currentImage[4] / 100) * imageHeight}px"
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
}
.imageContainer {
	position: relative;
	width: auto;
	height: auto;
	display: inline-block;
	margin: 0 auto;
}
.imageContainer .page {
	position: relative;
	width: 800px;
	height: auto;
	display: block;
}
.imageContainer .highlight {
	position: absolute;
	background: rgba(255,255,0,0.4);
}
</style>