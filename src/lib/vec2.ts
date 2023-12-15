import { Directions } from "./animations.js"

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

	angle(v: Vec2) {
		return Math.atan2(v.y - this.y, v.x - this.x)
	}

	distance(v: Vec2) {
		return Math.sqrt((v.x - this.x) ** 2 + (v.y - this.y) ** 2)
	}

	projectSet(angle: number, distance: number) {
		this.x += Math.cos(angle) * distance
		this.y += Math.sin(angle) * distance
	}

	project(angle: number, distance: number) {
		return new Vec2(this.x + Math.cos(angle) * distance, this.y + Math.sin(angle) * distance)
	}

	asAngle() {
		return Math.atan2(this.y, this.x)
	}

	add(v: Vec2) {
		return new Vec2(this.x + v.x, this.y + v.y)
	}

	sub(v: Vec2) {
		return new Vec2(this.x - v.x, this.y - v.y)
	}

	addSet(v: Vec2) {
		this.x += v.x
		this.y += v.y
	}

	round() {
		return new Vec2(Math.round(this.x), Math.round(this.y))
	}

	lerp(v: Vec2, t: number) {
		return new Vec2(this.x + (v.x - this.x) * t, this.y + (v.y - this.y) * t)
	}

	lerpSet(v: Vec2, t: number) {
		this.x += (v.x - this.x) * t
		this.y += (v.y - this.y) * t
	}

	static ZERO = new Vec2(0, 0)
}

export const vec = (x: number, y: number) => new Vec2(x, y)
