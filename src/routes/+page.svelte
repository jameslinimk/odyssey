<script lang="TS">
	import { endMenu, showMenu } from "$lib/writables"
	import { onMount } from "svelte"
	import { fade } from "svelte/transition"

	onMount(async () => {
		const _ = await import("$lib/index")
	})

	const start = () => {
		endMenu()
	}
</script>

{#if $showMenu}
	<div transition:fade={{ duration: 300 }} class="test">
		<button on:click={start}> Start </button>
	</div>
{/if}

<style>
	.test {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: black;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	button {
		width: 100px;
		height: 50px;
		font-family: "Lucida Console", "Courier New", monospace;
		font-weight: bold;
		font-size: 20px;
	}
</style>
