import { Application, BaseTexture, Container, SCALE_MODES } from "pixi.js"
import { iRand } from "./animations.js"
import type { Arrow } from "./arrow.js"
import { Enemy, SUITORS } from "./enemy.js"
import { KEY_PRESSED, MOUSE_PRESSED } from "./events.js"
import { addMaps } from "./map.js"
import { Player, ease } from "./player.js"
import { vec } from "./vec2.js"

export const SHOW_HITBOXES = true

export let arrows: Arrow[] = []

export const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max)

class NewApplication extends Application {
	elapsed = 0.0
	constructor(options: ConstructorParameters<typeof Application>[0]) {
		super(options)
	}

	get mousePos() {
		const pos = (this.renderer.events as any).rootPointerEvent.client
		return vec(pos.x, pos.y).sub(vec(cameraContainer.position.x, cameraContainer.position.y))
	}
}

export const app = new NewApplication({
	backgroundColor: 0x000000,
})
BaseTexture.defaultOptions.scaleMode = SCALE_MODES.NEAREST
app.stage.sortableChildren = true

const view = app.view as HTMLCanvasElement
document.body.appendChild(view)
view.style.position = "absolute"
view.style.top = "0"
view.style.left = "0"
view.oncontextmenu = (e) => e.preventDefault()

document.body.style.overflow = "hidden"

const resize = () => {
	app.renderer.resize(window.innerWidth, window.innerHeight)
}
resize()
window.addEventListener("resize", resize)

export const cameraContainer = new Container()
app.stage.addChild(cameraContainer)
cameraContainer.sortableChildren = true
addMaps()

const arrowAlreadyExp = new Set<number>()
const enemyAlreadyExp = new Set<number>()

export const SLOWDOWN = 1

export let enemies: Enemy[] = []
for (let i = 0; i < SUITORS; i++) {
	enemies.push(new Enemy(vec(100, iRand(300, 301))))
}

export const player = new Player()

const MAX_CAMERA_DISTANCE = Math.max(app.renderer.width, app.renderer.height) / 2
const CAMERA_SPEED = 5

app.ticker.add((dt) => {
	dt *= SLOWDOWN
	app.elapsed += dt

	const pos = vec(cameraContainer.position.x, cameraContainer.position.y)
	const target = vec(-player.rect.centerX + app.renderer.width / 2, -player.rect.centerY + app.renderer.height / 2)

	const distance = pos.distance(target)
	const ratio = clamp(distance / MAX_CAMERA_DISTANCE, 0, 1)
	const speed = ease(ratio) * CAMERA_SPEED

	const angle = pos.angle(target)
	const newPos = pos.project(angle, speed * dt)

	cameraContainer.position.x = newPos.x
	cameraContainer.position.y = newPos.y

	player.update(dt)
	arrows.forEach((a) => {
		if (arrowAlreadyExp.has(a.id)) return
		if (a.expired) {
			const t = setInterval(() => {
				a.arrow.alpha -= 0.02
				if (a.arrow.alpha <= 0) {
					a.arrow.destroy()
					a.rectGraphics?.destroy()
					clearInterval(t)
				}
			}, 10)
			arrowAlreadyExp.add(a.id)
			return
		}
		a.update(dt)
	})
	enemies.forEach((e) => {
		if (enemyAlreadyExp.has(e.id)) return
		if (e.expire) {
			const t = setInterval(() => {
				e.anim.do((s) => (s.alpha -= 0.02))
				if (e.anim.first.alpha <= 0) {
					e.anim.do((s) => s.destroy())
					e.rectGraphics?.destroy()
					clearInterval(t)
				}
			}, 10)
			enemyAlreadyExp.add(e.id)
			return
		}
		e.update(dt)
	})
	arrows = arrows.filter((a) => a.arrow.alpha > 0)
	enemies = enemies.filter((e) => e.anim.first.alpha > 0)

	KEY_PRESSED.clear()
	MOUSE_PRESSED.clear()
})

const w = window as any
w.app = app
w.player = player
w.arrows = arrows
w.enemies = enemies
