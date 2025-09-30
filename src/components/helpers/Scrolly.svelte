<script>
	/**
	 * This component manages which item is most in view for scroll triggering
	 * example:
	 * <Scrolly
	 * 	bind:value={scrollIndex}
	 * >
	 ***items here**
	 * </Scrolly>
	 *
	 * optional params with defaults
	 * <Scrolly root={null} top={0} bottom={0} increments={100}>
	 */
	
	let {
		root = null,
		top = 0,
		bottom = 0,
		increments = 100,
		value = $bindable(undefined),
		children
	} = $props();
	
	let steps = [];
	let threshold = [];
	let nodes = [];
	let intersectionObservers = [];
	let container = undefined;
	let stepPositions = [];
	
	function findActiveStep() {
		if (!nodes.length) return;
		
		const triggerLine = window.scrollY + top;
		let activeIndex = -1;
		
		// Find the step whose top has most recently crossed the trigger line
		for (let i = 0; i < nodes.length; i++) {
			const rect = nodes[i].getBoundingClientRect();
			const elementTop = window.scrollY + rect.top;
			
			// If element top is at or past the trigger line, this could be our active step
			if (elementTop <= triggerLine) {
				activeIndex = i;
			} else {
				// Stop at first element that hasn't crossed the trigger line yet
				break;
			}
		}
		
		// Update value
		if (activeIndex >= 0) {
			value = activeIndex;
		} else {
			value = undefined;
		}
	}
	
	function mostInView() {
		let maxRatio = 0;
		let maxIndex = 0;
		for (let i = 0; i < steps.length; i++) {
			if (steps[i] > maxRatio) {
				maxRatio = steps[i];
				maxIndex = i;
			}
		}
		if (maxRatio > 0) value = maxIndex;
		else value = undefined;
	}
	
	function createObserver(node, index) {
		const handleIntersect = (e) => {
			const intersecting = e[0].isIntersecting;
			const ratio = e[0].intersectionRatio;
			steps[index] = ratio;
			
			// Use the new trigger method instead of mostInView
			findActiveStep();
		};
		
		const marginTop = top ? top * -1 : 0;
		const marginBottom = bottom ? bottom * -1 : 0;
		const rootMargin = `${marginTop}px 0px ${marginBottom}px 0px`;
		const options = { root, rootMargin, threshold };
		
		if (intersectionObservers[index]) intersectionObservers[index].disconnect();
		const io = new IntersectionObserver(handleIntersect, options);
		io.observe(node);
		intersectionObservers[index] = io;
	}
	
	function update() {
		if (!nodes.length) return;
		nodes.forEach(createObserver);
	}
	
	// Add scroll listener for more precise triggering
	// function handleScroll() {
	// 	findActiveStep();
	// }
	
	$effect(() => {
		for (let i = 0; i < increments + 1; i++) {
			threshold.push(i / increments);
		}
		nodes = container.querySelectorAll(":scope > *:not(iframe)");
		update();
		
		// Add scroll listener
		// window.addEventListener('scroll', handleScroll);
		
		// Cleanup function
		return () => {
			// window.removeEventListener('scroll', handleScroll);
			intersectionObservers.forEach(observer => observer.disconnect());
		};
	});
	
	$effect(() => {
		top;
		bottom;
		update();
	});
</script>

<div class="scrollyContainer" bind:this={container}>
	{@render children?.()}
</div>
