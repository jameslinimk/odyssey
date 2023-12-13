import { Application } from "pixi.js"
import { KEY_PRESSED, MOUSE_PRESSED } from "./events.js"
import { Player, vec } from "./player.js"

class NewApplication extends Application {
	elapsed = 0.0
	constructor(options: ConstructorParameters<typeof Application>[0]) {
		super(options)
	}

	get mousePos() {
		const pos = (this.renderer.events as any).rootPointerEvent.client
		return vec(pos.x, pos.y)
	}
}

export const app = new NewApplication({
	backgroundColor: 0x1099bb,
})
document.body.appendChild(app.view as any)
const s = app.view.style as any
s.position = "absolute"
s.top = "0"
s.left = "0"

const resize = () => {
	app.renderer.resize(window.innerWidth, window.innerHeight)
}
resize()
window.addEventListener("resize", resize)

const player = new Player()

app.ticker.add((dt) => {
	app.elapsed += dt
	player.update(dt)

	KEY_PRESSED.clear()
	MOUSE_PRESSED.clear()
})
