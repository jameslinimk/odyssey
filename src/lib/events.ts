const KEY_DOWN = new Set()
export const KEY_PRESSED = new Set()

export const keyDown = (key: string) => KEY_DOWN.has(key)
export const keyPressed = (key: string) => KEY_PRESSED.has(key)

window.addEventListener("keydown", (e) => {
	KEY_PRESSED.add(e.code)
})

window.addEventListener("keydown", (e) => {
	KEY_DOWN.add(e.code)
})

window.addEventListener("keyup", (e) => {
	KEY_DOWN.delete(e.code)
})

const MOUSE_DOWN = new Set()
export const MOUSE_PRESSED = new Set()

export const mouseDown = (button: number) => MOUSE_DOWN.has(button)
export const mousePressed = (button: number) => MOUSE_PRESSED.has(button)

window.addEventListener("mousedown", (e) => {
	MOUSE_DOWN.add(e.button)
	MOUSE_PRESSED.add(e.button)
})

window.addEventListener("mouseup", (e) => {
	MOUSE_DOWN.delete(e.button)
})
