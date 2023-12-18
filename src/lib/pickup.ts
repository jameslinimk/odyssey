import { DEV, app, cameraContainer, player } from "$lib"
import { Sprite, Texture } from "pixi.js"
import { iRand } from "./animations.js"
import { NewRectangle } from "./player.js"
import type { Vec2 } from "./vec2.js"

const foodPickup = Texture.from("food.png")

export let pickups: Pickup[] = []
export const addPickup = (pos: Vec2) => pickups.push(new Pickup(pos))
export const clearPicks = () => (pickups = pickups.filter((p) => !p.pickedUp))

export enum PickupType {}

export class Pickup {
	rect: NewRectangle
	sprite = new Sprite(foodPickup)
	health = iRand(5, 10)
	graphics: Sprite | null = null
	spawned = app.elapsed
	duration = 1_000
	constructor(public pos: Vec2) {
		this.rect = NewRectangle.fromCenter(pos.x, pos.y, 24, 24)
		this.sprite.anchor.set(0.5, 0.5)
		this.sprite.position.set(pos.x, pos.y)
		cameraContainer.addChild(this.sprite)

		if (DEV) {
			this.graphics = new Sprite(Texture.WHITE)
			this.graphics.width = this.rect.width
			this.graphics.height = this.rect.height
			this.graphics.alpha = 0.5
			this.graphics.x = this.rect.x
			this.graphics.y = this.rect.y
			this.graphics.zIndex = 2
			cameraContainer.addChild(this.graphics)
		}
	}

	update() {
		if (app.elapsed - this.spawned > this.duration) {
			this.sprite.destroy()
			this.graphics?.destroy()
			this.pickedUp = true
			return
		}

		if (this.rect.intersects(player.rect)) {
			this.pickup()
		}
	}

	pickedUp = false
	pickup() {
		player.hp = Math.min(player.hp + this.health, player.maxHp)
		this.sprite.destroy()
		this.graphics?.destroy()
		this.pickedUp = true
	}
}
