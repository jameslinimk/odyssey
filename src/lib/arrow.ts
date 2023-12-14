import { app, player } from "$lib"
import { SCALE_MODES, Sprite } from "pixi.js"
import { NewRectangle, type Vec2 } from "./player.js"

export const arrows: Arrow[] = []

let id = 0

// Load arrow texture
Sprite.from("arrow.png").destroy()

export class Arrow {
	get expired() {
		if (this.maxDistance !== undefined && this.pos.distance(this.start) > this.maxDistance) return true
		if (this.maxTime !== undefined && app.elapsed - this.startTime > this.maxTime) return true
		return false
	}

	id = id++
	pos: Vec2
	startTime = app.elapsed
	arrow = Sprite.from("arrow.png")
	rect: NewRectangle
	constructor(
		public start: Vec2,
		public angle: number,
		public speed: number,
		public dmg: number,
		public maxDistance?: number,
		public maxTime?: number,
		public enemy = false,
	) {
		if (maxDistance === undefined && maxTime === undefined) throw new Error("Arrow must have maxDistance or maxTime")
		this.pos = start.clone()
		arrows.push(this)
		this.arrow.texture.baseTexture.scaleMode = SCALE_MODES.LINEAR
		this.arrow.anchor.set(0.5, 0.5)
		this.arrow.position.set(this.pos.x, this.pos.y)
		this.arrow.rotation = angle + Math.PI
		app.stage.addChild(this.arrow)

		this.rect = NewRectangle.fromCenter(this.pos.x, this.pos.y, 5, 5)
	}

	update(dt: number) {
		this.pos.projectSet(this.angle, this.speed * dt)
		this.arrow.position.set(this.pos.x, this.pos.y)
		this.rect.center = this.pos

		if (this.enemy) {
			if (this.rect.intersects(player.rect)) {
				player.hit(this.dmg)
			}
		} else {
			// throw new Error("Not implemented")
		}
	}
}
