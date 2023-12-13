<script lang="TS">
	import { onMount } from "svelte"

	onMount(async () => {
		const _ = await import("$lib/animations")
	})
</script>

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to read the documentation</p>
