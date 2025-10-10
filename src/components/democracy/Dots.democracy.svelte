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
		onUpdate
	} = $props();

	const startYear = 1894;
	let dotSize = 3;
	let hlSize = 3;

	// Imports
	import P5 from "p5-svelte";
	import theme_combinations from "$data/theme_combinations.json";

	// vars
	const defaultColors = {"none": [220, 120, 200], "categorized": [63, 27, 72]};
	let defaultColor = [220, 120, 200];
	let atlasGrotesk;
	const hlColor = [255, 174, 107];
	const threatColor = [247, 106, 233];
	let decade = Math.floor(year / 10) * 10;
	const colorByDecade = false;
	let dotPadding = 1;
	const bottomPadding = 40;

	let oldContainerWidth = containerWidth;
	let oldContainerHeight = containerHeight;

	const decade_themes = {
		// ... (data unchanged)
	};

	// The main p5.js sketch function
	const sketch = (p) => {
		let dots = [];
		let denominator = 5;
		let lastSortedCategory;
		let dotsPerYear = {};

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
					const aHasSelected = selectedCategory === "threat_policy"
						? (a.themes.includes("threat_systemic_policy") || a.themes.includes("threat_demographic_identity"))
						: a.themes.includes(selectedCategory);
					const bHasSelected = selectedCategory === "threat_policy"
						? (b.themes.includes("threat_systemic_policy") || b.themes.includes("threat_demographic_identity"))
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
		};

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

		p.draw = () => {
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
			decade = String(Math.floor(year / 10) * 10);
			for (let dot of dots) {
				dot.update();
				if (!dot.arrived) {
					dot.setDisplay();
					dot.move();
				}
				dot.display();
			}
			if (year >= 1880) {
				makeAxis();
			}
			onUpdate(false);
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
				p.text(i, yearToXAxis(i) * p.width, p.height - 10);
			}
		}

		function yearToXAxis(y) {
			return (155 - (2030 - y)) / 155;
		}

		class Dot {
			constructor(_year, _month, themes, num, total) {
				this.year = _year;
				this.month = _month;
				this.themes = themes;
				this.pos = p.createVector(p.width * Math.random(), p.height * Math.random());
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
				this.centerX = p.width * Math.random();
				this.centerY = p.height * Math.random();
				this.loaded = false;
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
					const radius = p.min(p.width, p.height);
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
					const targetX = yearToXAxis(this.year) * p.width;
					if (barChart) {
						const numColumns = p.width > 1300 ? 2 : 1;
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

						const yPosInStack = yFraction * chartHeight;
						const targetY = p.height - bottomPadding - yPosInStack;

						// Set the position with no horizontal offset
						this.targetPos.set(targetX, targetY);
						this.opacity = p.lerp(this.opacity, 200, 0.1);
					}
				}
			}

			setDisplay() {
				this.targetColor = defaultColor;
				const themesToCheck = selectedCategory === "threat_policy"
					? ["threat_systemic_policy", "threat_demographic_identity"]
					: [selectedCategory];
				const hasSelectedTheme = themesToCheck.some(theme => this.themes.includes(theme));
				if (hasSelectedTheme && year >= startYear) {
					this.targetColor = hlColor;
					this.size = hlSize
				} else if (this.themes.includes("threat_general") && year >= startYear) {
					this.targetColor = threatColor;
					this.size = dotSize;
				} else {
					this.size = dotSize;
				}
				if (!barChart) {
					this.size = dotSize*1.5;
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
				p.stroke(this.color);
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
