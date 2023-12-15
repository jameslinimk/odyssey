<script lang="ts">
	import { onMount } from "svelte"

	// Rushed rewrite l8r

	onMount(() => {
		const grid = document.getElementById("grid")
		const exportButton = document.getElementById("exportButton")
		let isDragging = false
		let dragState: "adding" | "removing" | null = null // null, 'adding', or 'removing'

		// Create 24x24 tiles
		for (let i = 0; i < 64 * 2 * 74 * 2; i++) {
			const tile = document.createElement("div")
			tile.classList.add("tile")
			;(tile as any).dataset.index = i
			grid!.appendChild(tile)

			tile.addEventListener("click", function (e) {
				if (!isDragging) {
					// Only toggle on click, not drag
					;(e.target as any).classList.toggle("selected")
				}
			})

			tile.addEventListener("mouseenter", function () {
				if (isDragging) {
					if (dragState === "adding") {
						tile.classList.add("selected")
					} else if (dragState === "removing") {
						tile.classList.remove("selected")
					}
				}
			})
		}

		// Handle mouse down events
		grid!.addEventListener("mousedown", function (e) {
			isDragging = true
			e.preventDefault() // Prevent default drag behavior
			// Determine dragState based on the first tile
			if ((e.target as any).classList.contains("tile")) {
				dragState = (e.target as any).classList.contains("selected") ? "removing" : "adding"
				;(e.target as any).classList.toggle("selected", dragState === "adding")
			}
		})

		document.addEventListener("mouseup", function () {
			isDragging = false
			dragState = null
		})

		// Export selected tiles
		exportButton!.addEventListener("click", function () {
			const selectedTiles: number[][] = []
			document.querySelectorAll(".tile.selected").forEach((tile) => {
				const index = (tile as any).dataset.index
				const xy = [index % 128, Math.floor(index / 128)]
				selectedTiles.push(xy)
			})
			console.log("Selected Tiles:", selectedTiles)
		})
	})
</script>

<div id="grid"></div>
<button id="exportButton">Export Selection</button>

<style>
	#grid {
		display: grid;
		grid-template-columns: repeat(calc(64 * 2), 12px);
		grid-template-rows: repeat(calc(74 * 2), 12px);
		background-image: url("real_map.png");
		background-repeat: no-repeat;
	}

	:global(.tile) {
		cursor: pointer;
	}

	:global(.tile.selected) {
		background-color: #0f0; /* Green background for selected tiles */
	}
</style>
