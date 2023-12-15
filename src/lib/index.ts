import { Application, BaseTexture, Container, SCALE_MODES, Sprite, Texture } from "pixi.js"
import { LayeredAnim, drawLayers, fRand } from "./animations.js"
import { arrowTexture, type Arrow } from "./arrow.js"
import { Enemy, killed, p1Sheets } from "./enemy.js"
import { KEY_PRESSED, MOUSE_PRESSED } from "./events.js"
import { COLLISION_TILE_SIZE, addMaps } from "./map.js"
import { Player, ease } from "./player.js"
import spawns from "./spawns.json"
import { Vec2, vec } from "./vec2.js"

export const SHOW_HITBOXES = false

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

const pause = (p: any) => {
	p.staggered = true
	p.endStagger = Infinity
	p.ogStaggerSpeed = p.staggerSpeed
	p.staggerSpeed = 0
	p.hide = true
	p.anim.do((s: any) => (s.alpha = 0))
}

const resume = (p: any) => {
	p.staggered = false
	p.endStagger = -Infinity
	p.staggerSpeed = p.ogStaggerSpeed
	p.hide = false
	p.anim.do((s: any) => (s.alpha = 1))
}

const firstSpawns: [number, number][] = []

export let enemies: Enemy[] = []
spawns.forEach(([x, y]) => {
	if (Math.random() > 0.5) return
	firstSpawns.push([x, y])

	const e = new Enemy(vec(x * COLLISION_TILE_SIZE, y * COLLISION_TILE_SIZE))
	pause(e)
	enemies.push(e)
})

const spawnMore = () => {
	if (enemies.length > 30 || killed > 100) return
	spawns.forEach(([x, y]) => {
		if (Math.random() > 0.3) return
		firstSpawns.push([x, y])

		const e = new Enemy(vec(x * COLLISION_TILE_SIZE, y * COLLISION_TILE_SIZE))
		enemies.push(e)
	})
}

export const player = new Player()
pause(player)

const MAX_CAMERA_DISTANCE = Math.max(app.renderer.width, app.renderer.height) / 2
const CAMERA_SPEED = 5

export enum Gods {
	Athena,
}

interface GodInfo {
	startPower: () => void
	endPower: () => void
	icon: Texture
}

export const GOD_INFO: Record<Gods, GodInfo> = {
	[Gods.Athena]: {
		icon: Texture.from("quiver.png"),
		startPower: () => {
			player.mod("speed", 0.15)
			player.mod("arrow_dmg", 0.2)
			player.mod("slash_dmg", 0.2)
			player.mod("dmgTaken", -0.2)
		},
		endPower: () => {
			player.demod("speed", 0.15)
			player.demod("arrow_dmg", 0.2)
			player.demod("slash_dmg", 0.2)
			player.demod("dmgTaken", -0.2)
		},
	},
}

export const gods = [Gods.Athena]

const wait = (time: number) => new Promise((res) => setTimeout(res, time))

const tweenTo = async (from: Vec2, to: Vec2, duration: number, update: (v: Vec2) => void): Promise<void> => {
	return new Promise((resolve) => {
		const startTime = performance.now()
		const change = to.sub(from)

		const animate = (currentTime: number) => {
			let elapsedTime = currentTime - startTime
			if (elapsedTime > duration) elapsedTime = duration

			const progress = elapsedTime / duration
			const current = from.add(change.scale(progress))
			update(current)

			if (elapsedTime < duration) {
				requestAnimationFrame(animate)
			} else {
				resolve()
			}
		}

		requestAnimationFrame(animate)
	})
}

const awaitAnim = async (anim: LayeredAnim) =>
	new Promise((res) => {
		anim.first.onComplete = () => {
			res(null)
		}
	})

const axeTexture = Texture.from("axe.png")

const cutscene = async () => {
	// cameraContainer.position.x = -600 + app.renderer.width / 2
	// cameraContainer.position.y = -200 + app.renderer.height / 2

	const t = (v: Vec2) => v.scale(-1).add(vec(app.renderer.width / 2, app.renderer.height / 2))

	for (let i = 0; i < 12; i++) {
		const axe = new Sprite(axeTexture)
		axe.anchor.set(0.5, 0.5)
		axe.x = 670 + i * 20
		axe.y = 290
		// Random rotation between -15 and 15 degrees
		axe.rotation = fRand(-0.261799, 0.261799)
		cameraContainer.addChild(axe)
	}

	const idles: LayeredAnim[] = []
	firstSpawns.forEach(([x, y], i) => {
		const sheet = p1Sheets[i]
		const idle = drawLayers(
			`stand_up`,
			(s) => {
				s.animationSpeed = 0.1
				s.loop = true
				s.play()
				s.anchor.set(0.5, 0.5)
				s.x = x * COLLISION_TILE_SIZE
				s.y = y * COLLISION_TILE_SIZE
			},
			sheet,
		)
		idle.add()
		idles.push(idle)
	})

	await tweenTo(t(vec(600, 0)), t(vec(600, 300)), 750, (v) => {
		cameraContainer.position.x = v.x
		cameraContainer.position.y = v.y
	})

	const walkUp = drawLayers("walk_up", (s) => {
		s.animationSpeed = 0.1
		s.loop = true
		s.play()
	})
	walkUp.add()
	await tweenTo(vec(600, 600), vec(600, 250), 3000, (v) => {
		console.log(v)
		walkUp.do((s) => {
			s.x = v.x
			s.y = v.y
		})
	})
	walkUp.rem()
	const idleDown = drawLayers("stand_down", (s) => {
		s.animationSpeed = 0.1
		s.loop = true
		s.play()
		s.x = 600
		s.y = 250
	})
	idleDown.add()
	await wait(1000)
	idleDown.rem()

	const draw = drawLayers("draw_right", (s) => {
		s.animationSpeed = 0.05
		s.loop = false
		s.play()
		s.x = 600
		s.y = 250
	})
	draw.add()
	await awaitAnim(draw)
	await wait(1000)
	draw.rem()
	const shoot = drawLayers("shoot_straight_right", (s) => {
		s.animationSpeed = 0.05
		s.loop = false
		s.play()
		s.x = 600
		s.y = 250
	})
	shoot.add()
	await awaitAnim(shoot)
	const arrow = new Sprite(arrowTexture)
	arrow.x = 650
	arrow.y = 280
	arrow.rotation = Math.PI
	cameraContainer.addChild(arrow)
	await tweenTo(vec(650, 0), vec(1000, 0), 1000, (v) => {
		arrow.x = v.x
	})
	tweenTo(vec(1, 1), vec(1, 0), 1000, (v) => {
		arrow.alpha = v.y
	}).then(() => arrow.destroy())
	shoot.rem()
	idleDown.add()

	await wait(2000)
	idleDown.rem()
	idles.forEach((i) => i.rem())
	resume(player)
	enemies.forEach((e) => resume(e))
}

await cutscene()
setInterval(() => {
	spawnMore()
}, 20_000)
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

	if (killed > 100) {
		alert("You win!")
	}

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
