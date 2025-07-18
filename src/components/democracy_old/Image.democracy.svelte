<script>
	import { fade } from 'svelte/transition';
	
	// Props
	let { 
		currentImage,
		imagePosition,
		opacity,
		preloadedDimensions,
		onImageLoad
	} = $props();
	
	// Internal state
	let imageElement;
	let imageWidth = $state(0);
	let imageHeight = $state(0);
	const hlPadding = 10;
	
	// Use preloaded dimensions if available
	$effect(() => {
		if (preloadedDimensions) {
			imageWidth = preloadedDimensions.width;
			imageHeight = preloadedDimensions.height;
			// Call parent's onImageLoad callback with preloaded dimensions
			onImageLoad?.(imageWidth, imageHeight);
		}
	});
	
	function handleImageLoad() {
		// Only calculate dimensions if we don't have preloaded ones
		if (!preloadedDimensions && imageElement) {
			imageWidth = imageElement.clientWidth;
			imageHeight = imageElement.clientHeight;
			// Call parent's onImageLoad callback with dimensions
			onImageLoad?.(imageWidth, imageHeight);
		}
	}
</script>
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
<style>
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
	opacity: 0.7;
}
</style>