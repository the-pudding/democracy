<script>
	// Props for the component
	let {
		year,
		month,
		containerWidth,
		containerHeight,
		barVariable,
		currentRow,
		transcriptWidth,
		transcriptHeight
	} = $props();

	// Imports
	import P5 from "p5-svelte";
	import volume_year from "$data/volume_year.json"; // Adjust path if needed

	// vars
	const heightRatio = 0.65;
	let dotSize = 2;
	const defaultColor = [73, 37, 82];
	let atlasGrotesk;

	// const hlColor = [255, 0, 212];
	const hlColor = [255, 0, 208];
	let decade = Math.floor(year / 10) * 10;
	const barChart = false;
	const colorByDecade = false;
	let dotPadding = 1;
	const bottomPadding = 30;

	const hlCategory = "authoritarian_threats";
	const decade_themes = {
		"1870": [],
		"1880": ["electoral_integrity","expanding_democracy","restricting_democracy"],
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
		"2010": ["expanding_democracy","restricting_democracy","authoritarian_threats"],
		"2020": ["authoritarian_threats"]
	};

	// The main p5.js sketch function
	const sketch = (p) => {
		let dots = [];
		let denominator = 5;

		const categories = [
			"authoritarian_threats",
			"electoral_integrity",
			"expanding_democracy",
			"restricting_democracy",
			"money_in_politics",
			"foreign_threats"
		];
		const categoryColors = {
			// electoral_integrity: [255, 99, 132],
			// expanding_democracy: [54, 162, 235],
			// restricting_democracy: [255, 206, 86],
			// money_in_politics: [75, 192, 192],
			// authoritarian_threats: [153, 102, 255],
			// foreign_threats: [255, 159, 64]

			electoral_integrity: [73, 37, 82],
			expanding_democracy: [73, 37, 82],
			restricting_democracy: [73, 37, 82],
			money_in_politics: [73, 37, 82],
			authoritarian_threats: [255, 0, 212],
			foreign_threats: [73, 37, 82]

			// electoral_integrity: [188, 120, 204],
			// expanding_democracy: [188, 120, 204],
			// restricting_democracy: [188, 120, 204],
			// money_in_politics: [188, 120, 204],
			// authoritarian_threats: [255, 0, 212],
			// foreign_threats: [188, 120, 204]
		};
		p.preload = () => {
			// atlasGrotesk = p.loadFont('assets/app/AtlasGrotesk-Regular-Web.otf'); // TiemposTextWeb-Regular.otf
		}

		p.setup = () => {
			p.textFont('Menlo');
			const canvasW = containerWidth || p.windowWidth;
			const canvasH = containerHeight || p.windowHeight;
			p.createCanvas(canvasW, canvasH);
			dotSizeSet();
			resizeCanvas();
			// --- DOT CREATION FOR ALL DATA ---
			dots = [];

			// Loop through the entire volume_year object to create dots for every year.
			for (const yearKey in volume_year) {
				const yearData = volume_year[yearKey];

				if (yearData) {
					let counter = 0;
					const totalCol = yearData.total;

					for (const category of categories) {
						const count = yearData[category];
						if (typeof count === "number") {
							const numDots = Math.floor(count / denominator);
							for (let i = 0; i < numDots; i++) {
								// Pass the specific year from our loop (yearKey)
								dots.push(
									new Dot(
										Number(yearKey),
										Math.ceil(((i + 1) / (numDots + 1)) * 12),
										category,
										counter,
										totalCol
									)
								);
								counter++;
							}
						}
					}
					const leftoverDots = Math.floor(totalCol / denominator) - counter;
					for (let i = 0; i < leftoverDots; i++) {
						dots.push(
							new Dot(
								Number(yearKey),
								Math.ceil(((i + 1) / (leftoverDots + 1)) * 12),
								"",
								counter,
								totalCol
							)
						);
						counter++;
					}
				}
			}
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
			for (let i = 1880; i <= 2020; i+=interval) {
				p.text(i, yearToXAxis(i) * p.width, p.height - 10);
			}
		}

		function yearToXAxis(y) {
			return (155 - (2030 - y))/155
		}

		function vectorsEqual(v1, v2) {
		  return v1.x === v2.x && v1.y === v2.y;
		}

		class Dot {
		    constructor(_year, _month, category, num, total) {
		        this.year = _year;
		        this.month = _month;
		        this.category = category;
		        this.pos = p.createVector(
		            p.width / 2 - transcriptWidth / 2 + Math.random() * transcriptWidth,
		            p.height / 4
		        );
		        this.targetPos = p.createVector(this.pos.x, this.pos.y);
		        this.vel = p.createVector(0, 0);
		        this.acc = p.createVector(0, 0);
		        this.total = total;
		        this.num = num;
		        if (barChart) {
		            this.finalPosPct = p.createVector(yearToXAxis(this.year), this.num);
		        } else {
		            this.finalPosPct = p.createVector(
		                yearToXAxis(this.year),
		                (Math.random() * this.total) / this.total
		            );
		        }

		        this.maxSpeed = p.random(2, 10);
		        this.maxForce = p.random(0.05, 0.5);
		        this.size = dotSize;
		        this.opacity = 0;
		        this.arrived = false;
		        this.color = defaultColor;
		        this.isFuture = true;
		    }

		    update() {
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
		        this.isFuture = this.year > year || (this.year === year && this.month > month);

		        if (this.isFuture) {
		            this.targetPos.set(
		                p.width / 2 - transcriptWidth / 2 + Math.random() * transcriptWidth,
		                p.height / 4
		            );
		            this.opacity = p.lerp(this.opacity, 0, 0.1);
		        } else {
		            if (barChart) {
		                // Determine the row and column from the dot's index (this.num)
		                const rowIndex = Math.floor(this.num / 2);
		                const colIndex = this.num % 2; // 0 for left, 1 for right

		                // Get the base X position for the year
		                const baseX = this.finalPosPct.x * p.width;

		                // Calculate the horizontal offset to create two columns
		                // A small offset based on dotSize will place them side-by-side
		                const xOffset = (colIndex - 0.5) * (dotSize + 1);

		                // Calculate the target X and Y positions
		                const targetX = baseX + xOffset;
		                const targetY = p.height - rowIndex * (dotSize + dotPadding) - bottomPadding;

		                this.targetPos = p.createVector(targetX, targetY);
		                 this.opacity = p.lerp(this.opacity, 255, 0.1);
		            } else {
		                this.targetPos = p.createVector(
		                    this.finalPosPct.x * p.width,
		                    p.height - this.finalPosPct.y * p.height * heightRatio - bottomPadding
		                );
		                 this.opacity = p.lerp(this.opacity, 200, 0.1);
		            }

		        }
		    }

		    setDisplay() {
		        this.color = defaultColor;
		        if (colorByDecade) {
		            if (decade_themes[decade].includes(this.category)) {
		                this.color = hlColor;
		            }
		        } else {
		            if (this.category == hlCategory) {
		                this.color = hlColor;
		            }
		        }
		        p.strokeWeight(this.size);
		    }

		    display() {
		        p.stroke(this.color[0], this.color[1], this.color[2], this.opacity);
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
