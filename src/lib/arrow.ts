import { SHOW_HITBOXES, app, arrows, cameraContainer, enemies, player } from "$lib"
import { SCALE_MODES, Sprite, Texture } from "pixi.js"
import { wallRects } from "./map.js"
import { NewRectangle } from "./player.js"
import type { Vec2 } from "./vec2.js"

let id = 0

const arrowTexture = Texture.from("arrow.png")

const OFFSET = -18

export class Arrow {
	_expired = false
	get expired() {
		if (this._expired) return true
		if (this.maxDistance !== undefined && this.pos.distance(this.start) > this.maxDistance) return true
		if (this.maxTime !== undefined && app.elapsed - this.startTime > this.maxTime) return true
		if (this.alreadyHit.size >= this.pierce) return true
		return false
	}

	id = id++
	pos: Vec2
	startTime = app.elapsed
	arrow = new Sprite(arrowTexture)
	rect: NewRectangle
	alreadyHit = new Set<number>()
	rectGraphics: Sprite | null = null
	constructor(
		public start: Vec2,
		public angle: number,
		public speed: number,
		public dmg: number,
		public maxDistance?: number,
		public maxTime?: number,
		public enemy = false,
		public pierce = 1,
	) {
		if (maxDistance === undefined && maxTime === undefined) throw new Error("Arrow must have maxDistance or maxTime")
		this.pos = start.clone()
		arrows.push(this)
		this.arrow.texture.baseTexture.scaleMode = SCALE_MODES.LINEAR
		this.arrow.anchor.set(0.5, 0.5)

		const back = this.pos.project(angle, OFFSET)
		this.arrow.position.set(back.x, back.y)

		this.arrow.rotation = angle + Math.PI
		cameraContainer.addChild(this.arrow)

		this.rect = NewRectangle.fromCenter(this.pos.x, this.pos.y, 5, 5)

		if (SHOW_HITBOXES) {
			this.rectGraphics = new Sprite(Texture.WHITE)
			this.rectGraphics.width = this.rect.width
			this.rectGraphics.height = this.rect.height
			this.rectGraphics.alpha = 0.8
			this.rectGraphics.x = this.rect.x
			this.rectGraphics.y = this.rect.y
			this.rectGraphics.zIndex = 2
			cameraContainer.addChild(this.rectGraphics)
		}
	}

	update(dt: number) {
		if (this.rectGraphics) {
			this.rectGraphics.x = this.rect.x
			this.rectGraphics.y = this.rect.y
		}

		if (this.enemy) {
			if (this.rect.intersects(player.rect)) {
				player.hit(this.dmg, this.angle)
			}
		} else {
			enemies.forEach((e) => {
				if (!this.alreadyHit.has(e.id) && this.alreadyHit.size < this.pierce && this.rect.intersects(e.rect)) {
					this.alreadyHit.add(e.id)
					e.hit(this.dmg, this.angle)
				}
			})
		}

		wallRects.forEach((w) => {
			if (this.rect.intersects(w)) {
				this._expired = true
			}
		})

		this.pos.projectSet(this.angle, this.speed * dt)

		const back = this.pos.project(this.angle, OFFSET)
		this.arrow.position.set(back.x, back.y)

		this.rect.center = this.pos
	}
}
