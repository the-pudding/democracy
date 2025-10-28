<script>
	// Props for the component
	import { fade } from "svelte/transition";
	let {
		year,
		month,
		containerWidth,
		containerHeight,
		currentRow,
		transcriptWidth,
		transcriptHeight,
		heightRatio,
		selectedCategory,
		barChart,
		prefersReducedMotion,
		loading,
		onUpdate,
		onDotClick = null // Add this new prop for handling dot clicks
	} = $props();

	const startYear = 1800;
	let dotSize = 3;
	let hlSize = 3;

	// Imports
	import P5 from "p5-svelte";
	import theme_combinations from "$data/theme_combinations.json";
	import all_speeches from "$data/all_dem_speeches.json";

	// vars
	let atlasGrotesk;
	const defaultColors = { none: [220, 120, 200], categorized: [63, 27, 72] };
	let defaultColor = [220, 120, 200];
	// const hlColor = [255, 174, 107];
	// const threatColor = [247, 106, 233];
	const hlColor = [255, 13, 243];
	let threatColor = [63, 27, 72];
	let decade = Math.floor(year / 10) * 10;
	const colorByDecade = false;
	let dotPadding = 1;
	const bottomPadding = 40;
	const sidePadding = 10;

	let oldContainerWidth = containerWidth;
	let oldContainerHeight = containerHeight;

	// ADDED: State variable to track the year to highlight
	let highlightedYear = $state(null);

	const decade_themes = {
		// ... (data unchanged)
	};

	// The main p5.js sketch function
	const sketch = (p) => {
		let dots = [];
		let denominator = 5;
		let lastSortedCategory;
		let dotsPerYear = {};

		// Spatial grid variables for efficient click detection
		let selectedDot = null; // This will still track if a *specific dot* was clicked in explore mode
		let spatialGrid = {};
		let gridCellSize = 20; // Adjust based on your dot density

		// Helper function to get grid key
		function getGridKey(x, y) {
			const gridX = Math.floor(x / gridCellSize);
			const gridY = Math.floor(y / gridCellSize);
			return `${gridX},${gridY}`;
		}

		// Update spatial grid after dots move
		function updateSpatialGrid() {
			spatialGrid = {};
			for (let dot of dots) {
				if (dot.opacity > 10) {
					const key = getGridKey(dot.pos.x, dot.pos.y);
					if (!spatialGrid[key]) {
						spatialGrid[key] = [];
					}
					spatialGrid[key].push(dot);
				}
			}
		}

		function resortAndReindexDots() {
			if (!dots || dots.length === 0) return;
			const dotsByYear = dots.reduce((acc, dot) => {
				if (!acc[dot.year]) {
					acc[dot.year] = [];
				}
				acc[dot.year].push(dot);
				return acc;
			}, {});
			for (const yearKey in dotsByYear) {
				const yearGroup = dotsByYear[yearKey];
				yearGroup.sort((a, b) => {
					const aHasThreat = a.themes.includes("threat_general");
					const bHasThreat = b.themes.includes("threat_general");
					const aHasSelected =
						selectedCategory === "threat_policy"
							? a.themes.includes("threat_systemic_policy") ||
								a.themes.includes("threat_demographic_identity")
							: a.themes.includes(selectedCategory);
					const bHasSelected =
						selectedCategory === "threat_policy"
							? b.themes.includes("threat_systemic_policy") ||
								b.themes.includes("threat_demographic_identity")
							: b.themes.includes(selectedCategory);
					if (aHasThreat && !bHasThreat) return -1;
					if (!aHasThreat && bHasThreat) return 1;
					if (aHasSelected && !bHasSelected) return -1;
					if (!aHasSelected && bHasSelected) return 1;
					return Math.random() - 0.5;
				});
				yearGroup.forEach((dot, index) => {
					dot.num = index;
				});
			}
		}

		p.preload = () => {};

		p.setup = () => {
			p.textFont("Menlo");
			const canvasW = containerWidth || p.windowWidth;
			const canvasH = containerHeight || p.windowHeight;
			p.createCanvas(canvasW, canvasH);
			resizeCanvas();
			dots = [];
			for (const yearKey in theme_combinations) {
				const yearCombinations = theme_combinations[yearKey];
				if (yearCombinations) {
					let counter = 0;
					for (const [themes, count] of yearCombinations) {
						const numDots = Math.floor(count / denominator);
						for (let i = 0; i < numDots; i++) {
							dots.push(
								new Dot(
									Number(yearKey),
									Math.ceil(((i + 1) / (numDots + 1)) * 12),
									themes,
									counter,
									count
								)
							);
							counter++;
						}
					}
				}
			}
			dotsPerYear = {};
			for (const dot of dots) {
				dotsPerYear[dot.year] = (dotsPerYear[dot.year] || 0) + 1;
			}
			resortAndReindexDots();
			lastSortedCategory = selectedCategory;

			// Instantly position dots at target on load (unless year < 1880)
			if (year >= 1880) {
				for (let dot of dots) {
					dot.setDisplay();
					dot.move();
					// Instantly set position to target
					dot.pos.set(dot.targetPos);
					dot.vel.mult(0);
					dot.acc.mult(0);
					// Don't set arrived = true so dots can still update
					// Set opacity instantly based on whether dot is in future or not
					dot.opacity = dot.isFuture ? 0 : barChart ? 255 : 200;
				}
			}
		};

		// --- START: MODIFIED p.mousePressed FUNCTION ---
		p.mousePressed = () => {
			// First, check if the click is inside the canvas at all
			if (p.mouseX < 0 || p.mouseX > p.width || p.mouseY < 0 || p.mouseY > p.height) {
				return; // Click is outside canvas
			}

			let dotClicked = false;
			selectedDot = null; // Clear any previous specific dot selection

			// ---
			// BEHAVIOR 1: "Explore Mode" (year >= 2026) -> Try to click a dot first.
			// ---

			if (Number(year) >= 2026) {
				// Check only nearby grid cells
				const gridX = Math.floor(p.mouseX / gridCellSize);
				const gridY = Math.floor(p.mouseY / gridCellSize);

				// Search loop for specific dot
				for (let dx = -1; dx <= 1; dx++) {
					for (let dy = -1; dy <= 1; dy++) {
						const key = `${gridX + dx},${gridY + dy}`;
						const cellDots = spatialGrid[key];

						if (cellDots) {
							for (let dot of cellDots) {
								const distance = p.dist(p.mouseX, p.mouseY, dot.pos.x, dot.pos.y);
								if (distance < dot.size + 2) {
									selectedDot = dot; // Select the dot
									dotClicked = true; // Mark that we found one

									// Call external handler with full dot data
									if (onDotClick) {
										onDotClick({
											themes: dot.themes,
											year: dot.year,
											month: dot.month,
											total: dot.total
										});
									}
									// Update highlightedYear here too
									highlightedYear = dot.year;

									// We found our dot, so we can exit the search loops
									break;
								}
							}
						}
						if (dotClicked) break; // Exit outer dy loop
					}
					if (dotClicked) break; // Exit outer dx loop
				}
			}

			// ---
			// BEHAVIOR 2: Fallback Year Calculation (or primary for Story Mode)
			// This runs if:
			// 1. We are in "Story Mode" (year < 2026), OR
			// 2. We are in "Explore Mode" (year >= 2026) but did NOT click a dot.
			// ---
			if (!dotClicked && year > 2025) {
				// 1. Get the chart width
				const chartWidth = p.width - sidePadding * 2;

				// 2. Constrain the click to the horizontal bounds of the chart
				const clickX = p.constrain(p.mouseX - sidePadding, 0, chartWidth);

				// 3. Convert the pixel x-coordinate to a normalized value (0-1)
				const normX = clickX / chartWidth;

				// 4. Invert the yearToXAxis formula to find the year
				const clickedYearFractional = normX * 155 + 1875;

				// 5. Floor the result to get an integer year
				const clickedYear = Math.floor(clickedYearFractional);

				// 6. Constrain the year to the valid axis range
				const finalYear = p.constrain(clickedYear, 1880, 2030);

				// 7. Call the onDotClick handler with just the year.
				if (onDotClick) {
					onDotClick({
						year: finalYear,
						themes: null,
						month: null,
						total: null
					});
				}
				// Update highlightedYear here too, even if no specific dot was clicked
				highlightedYear = finalYear;
			}
		};
		// --- END: MODIFIED p.mousePressed FUNCTION ---

		p.windowResized = () => {
			resizeCanvas();
		};

		function resizeCanvas() {
			const canvasW = containerWidth || p.windowWidth;
			const canvasH = containerHeight || p.windowHeight;
			p.resizeCanvas(canvasW, canvasH);
			if (canvasW < 800) {
				dotSize = 2;
				hlSize = 2;
			} else {
				dotSize = 3;
				hlSize = 3;
			}
			// oldContainerWidth = containerWidth;
			// oldContainerHeight = containerHeight;
		}

		let displayYear = year;
		let lastYear = year;
		let lastMonth = month;

		p.draw = () => {
			// Clear selection if year or month changed
			if (year !== lastYear || month !== lastMonth) {
				selectedDot = null;
				// ADDED: Clear highlightedYear when the main 'year' prop changes (e.g., on scroll)
				highlightedYear = null;
				lastYear = year;
				lastMonth = month;
			}

			if (selectedCategory !== lastSortedCategory) {
				resortAndReindexDots();
				lastSortedCategory = selectedCategory;
			}
			// if (oldContainerWidth != containerWidth || oldContainerHeight != containerHeight) {
			// 	resizeCanvas();
			// }
			if (year < startYear) {
				defaultColor = defaultColors.none;
			} else {
				defaultColor = defaultColors.categorized;
			}
			p.background(11, 0, 13);

			// --- START: MODIFIED HIGHLIGHT RECTANGLE DRAWING ---
			// Draw year highlight rectangle if any year is highlighted
			if (highlightedYear) {
				p.noStroke();
				p.fill(255, 255, 255, 20); // White with low opacity
				const yearX = yearToXAxis(highlightedYear) * (p.width - sidePadding * 2) + sidePadding;
				// Calculate width to next year (or use a fixed width for the last year)
				const nextYearX =
					highlightedYear < 2020
						? yearToXAxis(highlightedYear + 1) * (p.width - sidePadding * 2) + sidePadding
						: yearX + (p.width - sidePadding * 2) / 155; // Approximate width for last year
				const rectWidth = nextYearX - yearX;
				p.rect(yearX - rectWidth / 2, 0, rectWidth, p.height - bottomPadding);
			}
			// --- END: MODIFIED HIGHLIGHT RECTANGLE DRAWING ---

			decade = String(Math.floor(year / 10) * 10);
			for (let dot of dots) {
				dot.update();
				if (!dot.arrived) {
					dot.setDisplay();
					dot.move();
				}
				dot.display();
			}

			// Update spatial grid occasionally (not every frame for performance)
			if (p.frameCount % 10 === 0 || Object.keys(spatialGrid).length === 0) {
				updateSpatialGrid();
			}

			if (year >= 1880) {
				makeAxis();
			}
			onUpdate(false);
			p.stroke("#784f72");
			p.strokeWeight(1);
			displayYear = p.lerp(displayYear, Number(year), 0.2);
			const lineX = yearToXAxis(displayYear) * (p.width - sidePadding*2) + sidePadding;
			// p.line(lineX, 0, lineX, containerHeight - bottomPadding);
			// p.fill("#ffffff");
			// p.text(displayYear,p.width/2,p.height/2);
		};

		function makeAxis(y) {
			p.textAlign(p.CENTER);
			p.fill("#82657d");
			p.noStroke();
			p.textSize(p.constrain(p.width / 100, 12, 19));
			let interval = 10;
			if (p.width < 1000) {
				interval = 20;
			}
			for (let i = 1880; i <= 2020; i += interval) {
				const xPos = yearToXAxis(i) * (p.width - sidePadding * 2) + sidePadding;
				p.text(i, xPos, p.height - 10);
			}
			if (!barChart) {
				for (let i = 0; i <= 4; i += 0.5) {
					p.textAlign(p.RIGHT);
					p.textSize(p.constrain(p.width / 100, 12, 15));
					const y = p.height - bottomPadding - (p.height - bottomPadding) * (i / 4.5);
					p.noStroke();
					p.text(i + "%", p.width - 2, y);
					p.stroke("#452941");
					p.strokeWeight(0.4);
					p.line(0, y + 3, p.width, y + 3);
				}
			}
		}

		function yearToXAxis(y) {
			// (year - 1875) / 155
			return (y - 1875) / 155;
		}

		class Dot {
			constructor(_year, _month, themes, num, total) {
				this.year = _year;
				this.month = _month;
				this.themes = themes;
				this.pos = p.createVector(
					p.random(sidePadding, p.width - sidePadding),
					p.random(0, p.height - bottomPadding)
				);
				this.targetPos = p.createVector(this.pos.x, this.pos.y);
				this.vel = p.createVector(0, 0);
				this.acc = p.createVector(0, 0);
				this.total = total;
				this.num = num;
				this.maxSpeed = p.random(6, 10);
				this.maxForce = p.random(0.5, 1);
				this.size = dotSize;
				this.opacity = 0;
				this.arrived = false;
				this.color = p.color(defaultColor[0], defaultColor[1], defaultColor[2]);
				this.targetColor = defaultColor;
				this.isFuture = true;
				this.centerX = p.random(sidePadding, p.width - sidePadding);
				this.centerY = p.random(0, p.height - bottomPadding);
				this.loaded = false;
				this.maxAreaHeight = all_speeches[_year].percentage;
			}

			update() {
				let desired = this.targetPos.copy();
				if (prefersReducedMotion) {
					this.pos = desired;
				}
				desired.sub(this.pos);
				let distance = desired.mag();
				if (distance < 1) {
					this.pos.set(this.targetPos);
					this.vel.mult(0);
					this.acc.mult(0);
					return;
				}
				if (distance < 100) {
					let speed = p.map(distance, 0, 100, 0, this.maxSpeed);
					desired.setMag(speed);
				} else {
					desired.setMag(this.maxSpeed);
				}
				desired.sub(this.vel);
				let steer = desired;
				steer.limit(this.maxForce);
				this.acc.add(steer);
				this.vel.mult(0.97);
				this.vel.add(this.acc);
				this.vel.limit(this.maxSpeed);
				this.pos.add(this.vel);
				this.acc.mult(0);
				if (distance < 1) {
					this.pos.set(this.targetPos);
					this.vel.mult(0);
					this.acc.mult(0);
					this.arrived = true;
					return;
				} else {
					this.arrived = false;
				}
			}

			move() {
				this.isFuture = this.year > year || (this.year === year && this.month >= month);
				if (year < 1880 && this.year < 1890) {
					const radius = p.min(p.width - sidePadding * 2, p.height);
					const totalDotsIn1880 = 50;
					const initialAngle = p.map(this.num, 0, totalDotsIn1880, 0, p.TWO_PI);
					const rotationAngle = p.frameCount * Math.random() * 10;
					const angle = initialAngle + rotationAngle;
					const targetX = this.centerX + radius * p.cos(angle);
					const targetY = this.centerY + radius * p.sin(angle);
					this.targetPos.set(targetX, targetY);
					this.targetColor = hlColor;
					this.opacity = p.lerp(this.opacity, 255, 0.1);
				} else if (this.isFuture) {
					this.targetPos.set(
						p.width / 2 - transcriptWidth / 2 + Math.random() * transcriptWidth,
						p.height / 4
					);
					this.opacity = p.lerp(this.opacity, 0, 0.1);
				} else {
					const targetX =
						yearToXAxis(this.year) * (p.width - sidePadding * 2) + sidePadding;
					if (barChart) {
						const numColumns = p.width - sidePadding * 2 > 1300 ? 2 : 1;
						const rowIndex = Math.floor(this.num / numColumns);
						const colIndex = this.num % numColumns;
						const xOffsetFactor = colIndex - (numColumns - 1) / 2;
						const xOffset = xOffsetFactor * (dotSize + 1);
						const targetY = p.height - rowIndex * (dotSize + dotPadding) - bottomPadding;
						this.targetPos.set(targetX + xOffset, targetY);
						this.opacity = p.lerp(this.opacity, 255, 0.1);
					} else {
						const totalDotsThisYear = dotsPerYear[this.year] || 1;
						const chartHeight = p.height - bottomPadding;

						// Calculate the Y position based on the dot's index in a single column
						let yFraction;
						if (totalDotsThisYear > 1) {
							// Map the index to a full 0-1 range to ensure endpoints touch the boundaries
							yFraction = this.num / (totalDotsThisYear - 1);
						} else {
							// Center the dot if it's the only one
							yFraction = 0.5;
						}

						const yPosInStack = yFraction * (chartHeight * this.maxAreaHeight / 4.5);
						const targetY = p.height - bottomPadding - yPosInStack;

						// Set the position with no horizontal offset
						this.targetPos.set(targetX, targetY);
						this.opacity = p.lerp(this.opacity, 200, 0.1);
					}
				}
			}

			setDisplay() {
				this.targetColor = defaultColor;
				const themesToCheck =
					selectedCategory === "threat_policy"
						? ["threat_systemic_policy", "threat_demographic_identity"]
						: [selectedCategory];
				const hasSelectedTheme = themesToCheck.some((theme) =>
					this.themes.includes(theme)
				);
				if (selectedCategory == "none" && year >= startYear && this.themes.length > 0) {
					this.targetColor = hlColor;
					this.size = hlSize;
				} else if (hasSelectedTheme && year >= startYear) {
					this.targetColor = hlColor;
					this.size = hlSize;
				} else if (this.themes.includes("threat_general") && year >= startYear) {
					this.targetColor = threatColor;
					this.size = dotSize;
				} else {
					this.size = dotSize;
				}
				if (!barChart) {
					this.size = dotSize * 1.5;
				}
				let target = p.color(
					this.targetColor[0],
					this.targetColor[1],
					this.targetColor[2]
				);
				this.color = p.lerpColor(this.color, target, 0.1);
				p.strokeWeight(this.size);
			}

			display() {
				this.color.setAlpha(this.opacity);

				// Add highlight for selected dot
				// if (this === selectedDot) {
				// 	// Draw selection ring
				// 	p.noFill();
				// 	p.stroke(255, 255, 255, this.opacity);
				// 	p.strokeWeight(1);
				// 	p.circle(this.pos.x, this.pos.y, this.size * 4);
				// }

				// Draw the dot
				p.stroke(this.color);
				p.strokeWeight(this.size);
				p.point(this.pos.x, this.pos.y, this.size);
			}
		}
	};
</script>

<P5 {sketch} />

<style>
	:global(canvas) {
		display: block;
	}
</style>
