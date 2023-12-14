import { Application, BaseTexture, SCALE_MODES } from "pixi.js"
import { arrows } from "./arrow.js"
import type { Enemy } from "./enemy.js"
import { KEY_PRESSED, MOUSE_PRESSED } from "./events.js"
import { Player, vec } from "./player.js"

export const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max)

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

const view = app.view as HTMLCanvasElement
document.body.appendChild(view)
view.style.position = "absolute"
view.style.top = "0"
view.style.left = "0"
view.oncontextmenu = (e) => e.preventDefault()

const resize = () => {
	app.renderer.resize(window.innerWidth, window.innerHeight)
}
resize()
window.addEventListener("resize", resize)

BaseTexture.defaultOptions.scaleMode = SCALE_MODES.NEAREST

const alreadyExp = new Set<number>()

export const enemies: Enemy[] = []

export const player = new Player()
app.ticker.add((dt) => {
	app.elapsed += dt
	player.update(dt)
	arrows.forEach((a) => {
		if (alreadyExp.has(a.id)) return
		if (a.expired) {
			const t = setInterval(() => {
				a.arrow.alpha -= 0.02
				if (a.arrow.alpha <= 0) {
					a.arrow.destroy()
					clearInterval(t)
				}
			}, 10)
			alreadyExp.add(a.id)
			return
		}
		a.update(dt)
	})

	KEY_PRESSED.clear()
	MOUSE_PRESSED.clear()
})

const w = window as any
w.app = app
w.player = player
w.arrows = arrows
w.enemies = enemies
