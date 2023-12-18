import { writable } from "svelte/store"

export const showMenu = writable(true)
export let mmRes: null | ((v: any) => void) = null
export const setRes = (res: (v: any) => void) => (mmRes = res)
export const endMenu = () => {
	if (mmRes) {
		mmRes(null)
		showMenu.set(false)
	}
}
export const menuReady = () => mmRes !== null
