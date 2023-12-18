import { DEV, SLOWDOWN, app, cameraContainer, clamp, enemies, player } from "$lib"
import { Sprite, Texture } from "pixi.js"
import { p1PolSheet, p1Sheet, p2PolSheet, p3PolSheet } from "./animation_sheets.js"
import { Directions, LayeredAnim, angleAsDir, drawLayers, fRand, fullSheets, iRand, parseAll, randSuitor } from "./animations.js"
import { MAP_SCALE, astarVec, wallRects } from "./map.js"
import { NewRectangle, OFFSET_X, OFFSET_Y, ease } from "./player.js"
import spawns from "./spawns.json"
import { Vec2, vec } from "./vec2.js"

export const SUITORS = spawns.length
const configs = new Array(SUITORS).fill(0).map(() => randSuitor("pol"))
console.log({ configs })
export const p1Sheets = await Promise.all(configs.map((c) => parseAll(fullSheets(c, p1Sheet(c), ["7tlb", "6tla"]))))
export const pol1Sheets = await Promise.all(configs.map((c) => parseAll(fullSheets(c, p1PolSheet(c), ["7tlb"]))))
const pol2Sheets = await Promise.all(configs.map((c) => parseAll(fullSheets(c, p2PolSheet(c), ["7tlb"]))))
const pol3Sheets = await Promise.all(configs.map((c) => parseAll(fullSheets(c, p3PolSheet(c), ["7tlb"]))))
let id = 0

const SLASH_FRAME = 2
export let killed = 0

export class Enemy {
	rect: NewRectangle
	colRect: NewRectangle
	rectGraphics: Sprite | null = null
	id = id++
	sheetId = iRand(0, SUITORS - 1)

	slashing = false
	lastSlash = -Infinity
	slashCooldown = 100
	slashAngle = 0
	slashDistance = 40
	slashSpeed = 0.07
	slashDmg = 20

	stand = Object.fromEntries(
		Object.values(Directions).map((d) => [
			d,
			drawLayers(
				`pol_idle_${d}`,
				(s) => {
					s.animationSpeed = 0.08 * SLOWDOWN
					;(s as any).ogSpeed = 0.08 * SLOWDOWN
				},
				pol2Sheets[this.sheetId],
			),
		]),
	) as Record<Directions, LayeredAnim>
	walk = Object.fromEntries(
		Object.values(Directions).map((d) => [
			d,
			drawLayers(
				`pol_move_${d}`,
				(s) => {
					s.animationSpeed = 0.15 * SLOWDOWN
					;(s as any).ogSpeed = 0.15 * SLOWDOWN
				},
				pol2Sheets[this.sheetId],
			),
		]),
	) as Record<Directions, LayeredAnim>
	hurt = Object.fromEntries(
		Object.values(Directions).map((d) => [
			d,
			drawLayers(
				`pol_hurt_${d}`,
				(s) => {
					s.animationSpeed = 0.15 * SLOWDOWN
					;(s as any).ogSpeed = 0.15 * SLOWDOWN
				},
				pol1Sheets[this.sheetId],
			),
		]),
	) as Record<Directions, LayeredAnim>
	dead = Object.fromEntries(
		Object.values(Directions).map((d) => [
			d,
			drawLayers(
				`pol_dead_${d}`,
				(s) => {
					s.animationSpeed = 0.05 * SLOWDOWN
					s.loop = false
					;(s as any).ogSpeed = 0.05 * SLOWDOWN
				},
				pol1Sheets[this.sheetId],
			),
		]),
	) as Record<Directions, LayeredAnim>
	slash = Object.fromEntries(
		Object.values(Directions).map((d) => [
			d,
			drawLayers(
				`pol_slash_${d}`,
				(s) => {
					s.animationSpeed = this.slashSpeed * SLOWDOWN
					s.loop = false
					;(s as any).ogSpeed = this.slashSpeed * SLOWDOWN
				},
				pol3Sheets[this.sheetId],
			),
		]),
	) as Record<Directions, LayeredAnim>

	anim = this.walk[Directions.Right]
	speed = fRand(0.5, 1.2)

	/* ----------------------------- Modifier logic ----------------------------- */
	modMap: Partial<Record<keyof this, number>> = {}
	ogMap: Partial<Record<keyof this, number>> = {}
	mod(attr: keyof this, mul: number) {
		if (!this.modMap[attr]) this.modMap[attr] = 0
		this.modMap[attr]! += mul

		if (!this.ogMap[attr]) this.ogMap[attr] = this[attr] as any
		this[attr] = (this.ogMap[attr]! + this.ogMap[attr]! * this.modMap[attr]!) as any
	}

	demod(attr: keyof this, mul: number) {
		if (!this.modMap[attr]) this.modMap[attr] = 0
		this.modMap[attr]! -= mul

		if (!this.ogMap[attr]) this.ogMap[attr] = this[attr] as any
		this[attr] = (this.ogMap[attr]! + this.ogMap[attr]! * this.modMap[attr]!) as any
	}

	staggered = false
	staggerAngle = 0
	endStagger = -Infinity
	maxStagger = 20
	staggerSpeed = 2

	maxHp = 15
	hp = this.maxHp

	expire = false
	hide = false

	dieDir = Directions.Up
	firstDie = false
	get die() {
		return this.hp <= 0
	}
	hit(dmg: number, staggerAngle = 0) {
		this.hp -= dmg
		if (this.die) {
			this.hp = 0
			killed++
		}

		// Stagger
		if (this.staggered || dmg < this.maxHp / 20) return
		this.staggered = true
		this.endStagger = app.elapsed + clamp(dmg / (this.maxHp / 3), 0, 1) * this.maxStagger
		this.staggerAngle = staggerAngle
		this.dieDir = angleAsDir(staggerAngle + Math.PI)
	}

	changeAnim(anim: LayeredAnim, checkSame = true, reset = false) {
		if (anim.anim === this.anim.anim && checkSame) return "same"
		this.anim.rem()
		this.anim.do((s) => s.gotoAndStop(0))
		this.anim = anim
		this.anim.add()
		this.anim.do((s) => {
			if (reset) s.gotoAndPlay(0)
			else s.play()
		})
	}

	constructor(pos: Vec2, sheetId?: number) {
		if (sheetId !== undefined) this.sheetId = sheetId
		this.changeAnim(this.anim, false)

		this.rect = NewRectangle.fromCenter(pos.x, pos.y, 24 * MAP_SCALE, 24 * MAP_SCALE * 2)
		this.colRect = NewRectangle.fromCenter(pos.x, pos.y, (24 * MAP_SCALE) / 2, (24 * MAP_SCALE * 2) / 2)

		if (DEV) {
			this.rectGraphics = new Sprite(Texture.WHITE)
			this.rectGraphics.width = this.colRect.width
			this.rectGraphics.height = this.colRect.height
			this.rectGraphics.alpha = 0.8
			this.rectGraphics.x = this.colRect.x
			this.rectGraphics.y = this.colRect.y
			this.rectGraphics.zIndex = 2
			cameraContainer.addChild(this.rectGraphics)
		}
	}

	updateGraphics() {
		if (!this.rectGraphics) return
		this.rectGraphics.x = this.colRect.x
		this.rectGraphics.y = this.colRect.y
	}

	path: Vec2[] = []

	vel = vec(0, 0)
	update(dt: number) {
		if (this.die) {
			if (this.firstDie) return
			this.firstDie = true
			this.changeAnim(this.dead[this.dieDir])
			this.anim.do((s) => {
				s.x = this.rect.x - OFFSET_X + 4
				s.y = this.rect.y - OFFSET_Y + 10
			})
			this.anim.first.onComplete = () => {
				this.expire = true
			}
			return
		}

		const angleToPlayer = this.rect.center.angle(player.rect.center)

		this.vel.clear()
		let dir = angleAsDir(angleToPlayer)

		const dist = this.rect.center.distance(player.rect.center)
		const there = dist < this.slashDistance

		if (there && !this.slashing && app.elapsed - this.lastSlash > this.slashCooldown) {
			this.slashing = true
			this.slashAngle = angleToPlayer

			this.changeAnim(this.slash[dir], false, true)
			Object.values(this.slash).forEach((a) => a.do((s) => (s.animationSpeed = this.slashSpeed * SLOWDOWN)))

			this.slash[dir].first.onComplete = () => {
				console.log("done")
				this.slashing = false
				this.lastSlash = app.elapsed
				this.slash[dir].first.onComplete = undefined
			}
			this.slash[dir].first.onFrameChange = (frame) => {
				if (frame === SLASH_FRAME) {
					if (this.rect.center.distance(player.rect.center) < this.slashDistance) {
						player.hit(this.slashDmg, this.slashAngle)
					}
				}
			}
		}
		if (this.slashing && this.staggered) this.slashing = false

		this.path = astarVec(this.rect.center, player.rect.center) ?? []
		if (!this.staggered && this.path.length > 1 && !there) {
			const target = this.path[1]
			const angle = this.rect.center.angle(target)
			this.rect.center = this.rect.center.project(angle, this.speed * dt)
			dir = angleAsDir(angle)

			const distance = this.rect.center.distance(target)
			if (distance < 6) this.path.shift()
		}

		/* --------------------------------- Stagger -------------------------------- */
		if (app.elapsed >= this.endStagger) this.staggered = false
		if (this.staggered) {
			this.changeAnim(this.hurt[angleAsDir(this.staggerAngle + Math.PI)])
			this.vel = Vec2.ZERO.project(this.staggerAngle, this.staggerSpeed * dt)
			this.vel.scaleSet(ease((this.endStagger - app.elapsed) / this.maxStagger))
		}

		/* -------------------------------- Animation ------------------------------- */
		if (!this.staggered) {
			if (there && !this.slashing) this.changeAnim(this.stand[dir])
			else if (!this.slashing) this.changeAnim(this.walk[dir])
		}

		/* ---------------------------- Push from enemies --------------------------- */
		const push = vec(0, 0)
		enemies.forEach((e) => {
			if (e === this) return
			if (this.rect.intersects(e.rect)) {
				const angle = this.rect.center.angle(e.rect.center)
				push.addSet(Vec2.ZERO.project(angle, -0.02 * dt))
			}
		})
		this.vel.addSet(push)

		/* -------------------------------- Collision ------------------------------- */
		if (!this.vel.isZero()) {
			const hRect = this.colRect.addVec(vec(this.vel.x, 0))
			wallRects.forEach((w) => {
				if (hRect.intersects(w)) {
					if (this.vel.x > 0) {
						this.colRect.x = w.x - this.colRect.width
					} else if (this.vel.x < 0) {
						this.colRect.x = w.x + w.width
					}
					this.vel.x = 0
				}
			})

			const vRect = this.colRect.addVec(vec(0, this.vel.y))
			wallRects.forEach((w) => {
				if (vRect.intersects(w)) {
					if (this.vel.y > 0) {
						this.colRect.y = w.y - this.colRect.height
					} else if (this.vel.y < 0) {
						this.colRect.y = w.y + w.height
					}
					this.vel.y = 0
				}
			})
		}

		this.rect.addVecSet(this.vel)
		this.colRect.center = this.rect.center
		this.anim.do((s) => {
			s.x = this.rect.x - OFFSET_X + 4
			s.y = this.rect.y - OFFSET_Y + 10
		})
		this.updateGraphics()

		if (this.hide) this.anim.do((s) => (s.alpha = 0))
		else this.anim.do((s) => (s.alpha = 1))
	}
}
