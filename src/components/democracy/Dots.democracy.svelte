<script>
	// Props for the component
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
		barChart
	} = $props();

	const startYear = 1894;

	// Imports
	import P5 from "p5-svelte";
	// import volume_year from "$data/volume_year.json"; // Adjust path if needed
	import theme_combinations from "$data/theme_combinations.json"; // Adjust path if needed

	// vars
	let dotSize = 2;
	// const defaultColor = [73, 37, 82];
	// const defaultColor = [93, 57, 102];
	const defaultColors = {"none": [220, 120, 200], "categorized": [93, 57, 102]};
	let defaultColor = [220, 120, 200];
	let atlasGrotesk;

	// const hlColor = [255, 0, 208];
	const hlColor = [255, 192, 66];
	const threatColor = [255, 74, 237];
	let decade = Math.floor(year / 10) * 10;
	const colorByDecade = false;
	let dotPadding = 1;
	const bottomPadding = 40;

	const decade_themes = {
		// ... (data unchanged)
	};

	// The main p5.js sketch function
	const sketch = (p) => {
		let dots = [];
		let denominator = 5;
		let lastSortedCategory; // Variable to track the category for sorting

		// const categories = [
		// 	"authoritarian_threats",
		// 	"electoral_integrity",
		// 	"expand_restrict",
		// 	// "expanding_democracy",
		// 	// "restricting_democracy",
		// 	"money_in_politics",
		// 	"foreign_threats"
		// ];
		// const categories = ["threat_general","threat_external","threat_internal","threat_systemic_policy","threat_demographic_identity"]

		// NEW: This function sorts dots within each year to place the selected category at the bottom.
		function resortAndReindexDots() {
		    if (!dots || dots.length === 0) return;

		    // 1. Group all dots by their year
		    const dotsByYear = dots.reduce((acc, dot) => {
		        if (!acc[dot.year]) {
		            acc[dot.year] = [];
		        }
		        acc[dot.year].push(dot);
		        return acc;
		    }, {});

		    // 2. For each year, sort the group and re-assign their 'num' index
		    for (const yearKey in dotsByYear) {
		        const yearGroup = dotsByYear[yearKey];

		        // Sort the array for this year
		        yearGroup.sort((a, b) => {
		            const aHasThreat = a.themes.includes("threat_general");
		            const bHasThreat = b.themes.includes("threat_general");

		            // Handle the threat_policy grouping
		            const aHasSelected = selectedCategory === "threat_policy"
		                ? (a.themes.includes("threat_systemic_policy") || a.themes.includes("threat_demographic_identity"))
		                : a.themes.includes(selectedCategory);

		            const bHasSelected = selectedCategory === "threat_policy"
		                ? (b.themes.includes("threat_systemic_policy") || b.themes.includes("threat_demographic_identity"))
		                : b.themes.includes(selectedCategory);

		            // First priority: Sort by threat_general
		            if (aHasThreat && !bHasThreat) return -1;
		            if (!aHasThreat && bHasThreat) return 1;

		            // Second priority: Within same threat status, sort by selectedCategory
		            if (aHasSelected && !bHasSelected) return -1;
		            if (!aHasSelected && bHasSelected) return 1;

		            // If both have same threat status AND same selected status, randomize
		            return Math.random() - 0.5;
		        });

		        // Re-assign the 'num' property based on the new sorted order
		        yearGroup.forEach((dot, index) => {
		            dot.num = index;
		        });
		    }
		}

		p.preload = () => {
			// atlasGrotesk = p.loadFont('assets/app/AtlasGrotesk-Regular-Web.otf');
		};

		p.setup = () => {
			p.textFont("Menlo");
			const canvasW = containerWidth || p.windowWidth;
			const canvasH = containerHeight || p.windowHeight;
			p.createCanvas(canvasW, canvasH);
			dotSizeSet();
			resizeCanvas();
			dots = [];
			// Loop through the entire volume_year object to create dots
			// for (const yearKey in volume_year) {
			// 	const yearData = volume_year[yearKey];

			// 	if (yearData) {
			// 		let counter = 0;
			// 		const totalCol = yearData.total;

			// 		for (const category of categories) {
			// 			const count = yearData[category];
			// 			if (typeof count === "number") {
			// 				const numDots = Math.floor(count / denominator);
			// 				for (let i = 0; i < numDots; i++) {
			// 					dots.push(
			// 						new Dot(
			// 							Number(yearKey),
			// 							Math.ceil(((i + 1) / (numDots + 1)) * 12),
			// 							category,
			// 							counter,
			// 							totalCol
			// 						)
			// 					);
			// 					counter++;
			// 				}
			// 			}
			// 		}
			// 		const leftoverDots = Math.floor(totalCol / denominator) - counter;
			// 		for (let i = 0; i < leftoverDots; i++) {
			// 			dots.push(
			// 				new Dot(
			// 					Number(yearKey),
			// 					Math.ceil(((i + 1) / (leftoverDots + 1)) * 12),
			// 					"",
			// 					counter,
			// 					totalCol
			// 				)
			// 			);
			// 			counter++;
			// 		}
			// 	}
			// }

			for (const yearKey in theme_combinations) {
			    const yearCombinations = theme_combinations[yearKey];
			    if (yearCombinations) {
			        let counter = 0;

			        // Iterate through each combination [[themes], count]
			        for (const [themes, count] of yearCombinations) {
			            const numDots = Math.floor(count / denominator);

			            for (let i = 0; i < numDots; i++) {
			                dots.push(
			                    new Dot(
			                        Number(yearKey),
			                        Math.ceil(((i + 1) / (numDots + 1)) * 12),
			                        themes, // Pass the array of themes
			                        counter,
			                        count // Or you might want totalCol for the year - see note below
			                    )
			                );
			                counter++;
			            }
			        }
			    }
			}

			// Perform the initial sort and index after all dots are created
			resortAndReindexDots();
			lastSortedCategory = selectedCategory;
		};

		p.windowResized = () => {
			resizeCanvas();
			dotSizeSet();
		};

		function resizeCanvas() {
			const canvasW = containerWidth || p.windowWidth;
			const canvasH = containerHeight || p.windowHeight;
			p.resizeCanvas(canvasW, canvasH);
			dotSizeSet();
			if (canvasH < 800) {
				dotPadding = 0;
			}
		}

		function dotSizeSet() {
			dotSize = p.width / 255 / 2;
			if (dotSize < 2) {
				dotSize = 2;
			}
		}

		p.draw = () => {
			// NEW: Check if the selectedCategory has changed, and if so, re-sort the dots
			if (selectedCategory !== lastSortedCategory) {
				resortAndReindexDots();
				lastSortedCategory = selectedCategory;
			}
			if (year < startYear) {
				defaultColor = defaultColors.none;
			} else {
				defaultColor = defaultColors.categorized;
			}

			p.background(30, 13, 33);
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

		// The Dot class remains unchanged from your original code
		class Dot {
			constructor(_year, _month, themes, num, total) {
				this.year = _year;
				this.month = _month;
				this.themes = themes;
				this.pos = p.createVector(
					p.width * Math.random(),
					p.height * Math.random()
				);
				this.targetPos = p.createVector(this.pos.x, this.pos.y);
				this.vel = p.createVector(0, 0);
				this.acc = p.createVector(0, 0);
				this.total = total;
				this.num = num; // This 'num' will be updated by the sorting function
				if (barChart) {
					this.finalPosPct = p.createVector(yearToXAxis(this.year), this.num);
				} else {
					this.finalPosPct = p.createVector(
						yearToXAxis(this.year),
						(Math.random() * this.total) / this.total
					);
				}

				this.maxSpeed = p.random(6, 16);
				this.maxForce = p.random(0.1, 1);
				this.size = dotSize;
				this.opacity = 0;
				this.arrived = false;
				this.color = p.color(defaultColor[0], defaultColor[1], defaultColor[2]);
				this.targetColor = defaultColor;
				this.isFuture = true;
				this.centerX = p.width * Math.random();
				this.centerY = p.height * Math.random();
			}

			update() {
				// ... (method unchanged)
				let desired = this.targetPos.copy();
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

				if (this.targetPos.x == this.pos.x && this.targetPos.y == this.pos.y) {
					this.arrived = true;
				} else {
					this.arrived = false;
				}
			}

			move() {
				// ... (method unchanged)
				this.isFuture = this.year > year || (this.year === year && this.month >= month);
				if (year < 1880 && this.year < 1890) {
					// --- Code for circular ANIMATION ---

					const radius = p.min(p.width, p.height); // Adjust for circle size

					// IMPORTANT: Replace 'totalDotsIn1880' with your actual variable.
					const totalDotsIn1880 = 50; // Example value, replace this!

					// 1. Calculate the dot's initial starting angle to space them out
					const initialAngle = p.map(this.num, 0, totalDotsIn1880, 0, p.TWO_PI);

					// 2. Add a rotation that changes over time based on the frame count
					const rotationAngle = p.frameCount * Math.random() * 10;

					// The final angle is the dot's starting position plus the current global rotation
					const angle = initialAngle + rotationAngle;

					// Calculate the new (x, y) position for the current frame
					const targetX = this.centerX + radius * p.cos(angle);
					const targetY = this.centerY + radius * p.sin(angle);

					// Set the new target position
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
					if (barChart) {
						// This layout calculation now works correctly because `this.num` has been re-indexed
						const rowIndex = Math.floor(this.num / 2);
						const colIndex = this.num % 2;
						const baseX = this.finalPosPct.x * p.width;
						const xOffset = (colIndex - 0.5) * (dotSize + 1);
						const targetX = baseX + xOffset;
						const targetY =
							p.height - rowIndex * (dotSize + dotPadding) - bottomPadding;
						this.targetPos = p.createVector(targetX, targetY);
						this.opacity = p.lerp(this.opacity, 255, 0.1);
					} else {
						this.targetPos = p.createVector(
							this.finalPosPct.x * p.width,
							p.height -
								this.finalPosPct.y * p.height * heightRatio -
								bottomPadding
						);
						this.opacity = p.lerp(this.opacity, 200, 0.1);
					}
				}
			}

			setDisplay() {
				// Determine the target color (your logic is already correct)
				this.targetColor = defaultColor;
				const themesToCheck = selectedCategory === "threat_policy"
					? ["threat_systemic_policy", "threat_demographic_identity"]
					: [selectedCategory];

				const hasSelectedTheme = themesToCheck.some(theme => this.themes.includes(theme));

				if (hasSelectedTheme && year >= startYear) {
					this.targetColor = hlColor;
					this.size = 4;
				} else if (this.themes.includes("threat_general") && year >= startYear) {
					this.targetColor = threatColor;
					this.size = 3;
				} else {
					this.size = 3;
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
