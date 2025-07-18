<script>
	import { getContext } from "svelte";
	import Footer from "$components/Footer.svelte";
	import Democracy from "$components/democracy/Main.democracy.svelte";
	const copy = getContext("copy");
	// const data = getContext("data");
</script>

<svelte:boundary onerror={(e) => console.error(e)}>
	<Democracy {copy} />
	<!-- <Footer recirc={true} /> -->
</svelte:boundary>
