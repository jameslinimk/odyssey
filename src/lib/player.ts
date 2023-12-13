import { app } from "$lib"
import { Graphics, Rectangle } from "pixi.js"
import { Directions, LayeredAnim, drawLayers } from "./animations.js"
import { keyDown } from "./events.js"

export class Vec2 {
	constructor(
		public x: number,
		public y: number,
	) {}

	clear() {
		this.x = 0
		this.y = 0
	}

	clone() {
		return new Vec2(this.x, this.y)
	}

	equals(v: Vec2) {
		return this.x === v.x && this.y === v.y
	}

	sign() {
		return new Vec2(Math.sign(this.x), Math.sign(this.y))
	}

	asDirection(def = Directions.Down) {
		if (this.x === 0 && this.y === 0) return def
		if (Math.abs(this.x) > Math.abs(this.y)) return this.x > 0 ? Directions.Right : Directions.Left
		return this.y > 0 ? Directions.Down : Directions.Up
	}

	isZero() {
		return this.x === 0 && this.y === 0
	}

	scaleSet(s: number) {
		this.x *= s
		this.y *= s
	}
}

export const vec = (x: number, y: number) => new Vec2(x, y)

export class NewRectangle extends Rectangle {
	constructor(x: number, y: number, width: number, height: number) {
		super(x, y, width, height)
	}

	static fromCenter(x: number, y: number, width: number, height: number) {
		return new NewRectangle(x - width / 2, y - height / 2, width, height)
	}

	static fromObj({ x, y, width, height }: { x: number; y: number; width: number; height: number }) {
		return new NewRectangle(x, y, width, height)
	}

	get centerX() {
		return this.x + this.width / 2
	}

	get centerY() {
		return this.y + this.height / 2
	}

	set centerX(x: number) {
		this.x = x - this.width / 2
	}

	set centerY(y: number) {
		this.y = y - this.height / 2
	}

	get center() {
		return vec(this.centerX, this.centerY)
	}

	set center(v: Vec2) {
		this.centerX = v.x
		this.centerY = v.y
	}

	add(v: Vec2) {
		this.x += v.x
		this.y += v.y
	}
}

export class Player {
	rect = NewRectangle.fromCenter(400, 300, 16, 16)
	rectGraphics = new Graphics()
	idles = Object.fromEntries(
		Object.values(Directions).map((d) => [
			d,
			drawLayers(`idle_${d}`, (s) => {
				s.animationSpeed = 0.1
			}),
		]),
	) as Record<Directions, LayeredAnim>
	moves = Object.fromEntries(
		Object.values(Directions).map((d) => [
			d,
			drawLayers(`move_${d}`, (s) => {
				s.animationSpeed = 0.1
			}),
		]),
	) as Record<Directions, LayeredAnim>
	runs = Object.fromEntries(
		Object.values(Directions).map((d) => [
			d,
			drawLayers(`run_${d}`, (s) => {
				s.animationSpeed = 0.1
			}),
		]),
	) as Record<Directions, LayeredAnim>
	anim = this.idles[Directions.Down]

	constructor() {
		this.changeAnim(this.anim, false)

		// Visualizing hitbox
		this.rectGraphics.beginFill(0xff0000)
		this.rectGraphics.drawRect(0, 0, this.rect.width, this.rect.height)
		this.rectGraphics.endFill()
		this.rectGraphics.x = this.rect.x
		this.rectGraphics.y = this.rect.y

		app.stage.addChild(this.rectGraphics)
	}

	updateGraphics() {
		this.rectGraphics.x = this.rect.x
		this.rectGraphics.y = this.rect.y
	}

	changeAnim(anim: LayeredAnim, f = true) {
		if (anim.anim === this.anim.anim && f) return
		this.anim.rem()
		this.anim = anim
		this.anim.add()
		this.anim.do((s) => s.gotoAndPlay(0))
	}

	lastVel = vec(0, 0)
	vel = vec(0, 0)
	update(dt: number) {
		this.vel.clear()
		if (keyDown("KeyW")) this.vel.y -= 1
		if (keyDown("KeyS")) this.vel.y += 1
		if (keyDown("KeyA")) this.vel.x -= 1
		if (keyDown("KeyD")) this.vel.x += 1

		const dir = this.vel.asDirection(this.lastVel.asDirection())
		this.vel.scaleSet(1 * dt)
		if (!this.vel.isZero()) {
			this.changeAnim(this.runs[dir])
			this.lastVel = this.vel.clone()
		} else {
			this.changeAnim(this.idles[dir])
		}

		this.rect.add(this.vel)

		this.anim.do((s) => {
			s.x = this.rect.x - 24
			s.y = this.rect.y - 24
		})
		this.updateGraphics()
	}
}
