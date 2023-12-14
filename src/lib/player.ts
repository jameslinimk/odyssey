import { app, clamp } from "$lib"
import { Graphics, Rectangle, Sprite } from "pixi.js"
import { Directions, LayeredAnim, angleAsDir, dirAsAngle, drawLayers } from "./animations.js"
import { Arrow } from "./arrow.js"
import { keyDown, keyPressed, mouseDown } from "./events.js"

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

	static ZERO = new Vec2(0, 0)
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

export class ProgressBar {
	base: Graphics
	cur: Graphics
	max: number
	curVal: number
	constructor(x: number, y: number, width: number, height: number, max: number, cur?: number, curColor?: number, baseColor?: number) {
		this.max = max
		this.curVal = cur ?? max

		this.base = new Graphics()
		this.base.beginFill(baseColor ?? 0x000000)
		this.base.drawRect(0, 0, width, height)
		this.base.endFill()
		this.base.x = x
		this.base.y = y

		this.cur = new Graphics()
		this.cur.beginFill(curColor ?? 0xff0000)
		this.cur.drawRect(0, 0, width, height)
		this.cur.endFill()
		this.cur.x = x
		this.cur.y = y
		this.update()

		app.stage.addChild(this.base)
		app.stage.addChild(this.cur)
	}

	update(cur?: number) {
		if (cur !== undefined) this.curVal = cur
		this.cur.width = this.base.width * (this.curVal / this.max)
	}
}

const STRAIGHT_PAUSE = 4

export class Player {
	maxHp = 100
	hp = this.maxHp
	maxShield = 100
	shield = 0
	maxStamina = 100
	stamina = this.maxStamina
	staminaRegen = 0.2
	staminaStandRegen = 0.5
	staminaRegenCooldown = 50

	attackMode: "bow" | "pol" = "bow"
	switching = false
	lastSwitch = -Infinity
	switchCooldown = 20

	staggered = false
	endStagger = -Infinity
	maxStagger = 100

	die = false
	hit(dmg: number) {
		if (this.iframe || this.lastHit + this.hitCooldown > app.elapsed) return
		this.lastHit = app.elapsed
		if (this.shield > 0) {
			this.shield -= dmg
			if (this.shield < 0) {
				this.hp += this.shield
				this.shield = 0
			}
		} else {
			this.hp -= dmg
		}

		// Dead
		if (this.hp <= 0) {
			this.hp = 0
			die = true
		}

		// Stagger
		if (this.staggered) return
		this.staggered = true
		this.endStagger = app.elapsed + (dmg / (this.maxHp / 3)) * this.maxStagger
	}

	iframe = false
	lastHit = -Infinity
	hitCooldown = 30

	lastDodge = -Infinity
	dodgeCooldown = 60
	dodgeDuration = 15
	dodgeSpeed = 5
	dodgeCost = 10
	dodgeAngle = 0
	dodgeDir = Directions.Down
	get dodging() {
		return this.lastDodge + this.dodgeDuration > app.elapsed
	}

	hpBar = new ProgressBar(10, 20, 200, 20, this.maxHp, this.hp)
	shieldBar = new ProgressBar(10, 10, 200, 10, this.maxShield, this.shield, 0x0000ff)
	staminaBar = new ProgressBar(10, 50, 200, 20, this.maxStamina, this.stamina, 0xffffff)

	shootFrame = 0
	get shootReady() {
		return this.shootFrame === STRAIGHT_PAUSE
	}
	pulling = false
	endShoot = false
	shootDelay = 40
	lastShot = -Infinity
	shootDelayBar: ProgressBar
	pullSpeed = 0.15
	dmg = 10

	attacking = false

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

	rect = NewRectangle.fromCenter(400, 300, 16, 16)
	rectGraphics = new Graphics()
	idles = Object.fromEntries(
		Object.values(Directions).map((d) => [
			d,
			drawLayers(`idle_${d}`, (s) => {
				s.animationSpeed = 0.08
				;(s as any).ogSpeed = 0.08
			}),
		]),
	) as Record<Directions, LayeredAnim>
	pol_idles = Object.fromEntries(
		Object.values(Directions).map((d) => [
			d,
			drawLayers(`pol_idle_${d}`, (s) => {
				s.animationSpeed = 0.08
				;(s as any).ogSpeed = 0.08
			}),
		]),
	) as Record<Directions, LayeredAnim>
	moves = Object.fromEntries(
		Object.values(Directions).map((d) => [
			d,
			drawLayers(`move_${d}`, (s) => {
				s.animationSpeed = 0.15
				;(s as any).ogSpeed = 0.15
			}),
		]),
	) as Record<Directions, LayeredAnim>
	pol_moves = Object.fromEntries(
		Object.values(Directions).map((d) => [
			d,
			drawLayers(`pol_move_${d}`, (s) => {
				s.animationSpeed = 0.15
				;(s as any).ogSpeed = 0.15
			}),
		]),
	) as Record<Directions, LayeredAnim>
	runs = Object.fromEntries(
		Object.values(Directions).map((d) => [
			d,
			drawLayers(`run_${d}`, (s) => {
				s.animationSpeed = 0.15
				;(s as any).ogSpeed = 0.15
			}),
		]),
	) as Record<Directions, LayeredAnim>
	dodges = Object.fromEntries(Object.values(Directions).map((d) => [d, drawLayers(`dodge_${d}`)])) as Record<Directions, LayeredAnim>
	pol_dodges = Object.fromEntries(Object.values(Directions).map((d) => [d, drawLayers(`pol_dodge_${d}`)])) as Record<Directions, LayeredAnim>
	straightShoots = Object.fromEntries(Object.values(Directions).map((d) => [d, drawLayers(`shoot_straight_${d}`, (s) => (s.animationSpeed = this.pullSpeed))])) as Record<Directions, LayeredAnim>
	draw = Object.fromEntries(
		Object.values(Directions).map((d) => [
			d,
			drawLayers(`draw_${d}`, (s) => {
				s.animationSpeed = 0.2
				s.loop = false
				;(s as any).ogSpeed = 0.2
			}),
		]),
	) as Record<Directions, LayeredAnim>
	pol_draw = Object.fromEntries(
		Object.values(Directions).map((d) => [
			d,
			drawLayers(`pol_draw_${d}`, (s) => {
				s.animationSpeed = 0.2
				s.loop = false
				;(s as any).ogSpeed = 0.2
			}),
		]),
	) as Record<Directions, LayeredAnim>
	sheath = Object.fromEntries(
		Object.values(Directions).map((d) => [
			d,
			drawLayers(`sheath_${d}`, (s) => {
				s.animationSpeed = 0.2
				s.loop = false
				;(s as any).ogSpeed = 0.2
			}),
		]),
	) as Record<Directions, LayeredAnim>
	pol_sheath = Object.fromEntries(
		Object.values(Directions).map((d) => [
			d,
			drawLayers(`pol_sheath_${d}`, (s) => {
				s.animationSpeed = 0.2
				s.loop = false
				;(s as any).ogSpeed = 0.2
			}),
		]),
	) as Record<Directions, LayeredAnim>
	pol_slash = Object.fromEntries(
		Object.values(Directions).map((d) => [
			d,
			drawLayers(`pol_slash_${d}`, (s) => {
				s.animationSpeed = 0.2
				s.loop = false
				;(s as any).ogSpeed = 0.2
			}),
		]),
	) as Record<Directions, LayeredAnim>
	pol_trust_1 = Object.fromEntries(
		Object.values(Directions).map((d) => [
			d,
			drawLayers(`pol_trust_1_${d}`, (s) => {
				s.animationSpeed = 0.2
				s.loop = false
				;(s as any).ogSpeed = 0.2
			}),
		]),
	) as Record<Directions, LayeredAnim>
	pol_trust_2 = Object.fromEntries(
		Object.values(Directions).map((d) => [
			d,
			drawLayers(`pol_trust_2_${d}`, (s) => {
				s.animationSpeed = 0.2
				s.loop = false
				;(s as any).ogSpeed = 0.2
			}),
		]),
	) as Record<Directions, LayeredAnim>
	dead = Object.fromEntries(
		Object.values(Directions).map((d) => [
			d,
			drawLayers(`dead_${d}`, (s) => {
				s.animationSpeed = 0.1
				s.loop = false
				;(s as any).ogSpeed = 0.1
			}),
		]),
	) as Record<Directions, LayeredAnim>
	pol_dead = Object.fromEntries(
		Object.values(Directions).map((d) => [
			d,
			drawLayers(`pol_dead_${d}`, (s) => {
				s.animationSpeed = 0.1
				s.loop = false
				;(s as any).ogSpeed = 0.1
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

		// app.stage.addChild(this.rectGraphics)

		const quiver = Sprite.from("quiver.png")
		quiver.x = 0
		quiver.y = app.renderer.height - 75
		quiver.width = 75
		quiver.height = 75
		app.stage.addChild(quiver)

		this.shootDelayBar = new ProgressBar(0, app.renderer.height - 75, 75, 75, this.shootDelay, this.shootDelay, 0x000000, 0x000000)
		this.shootDelayBar.base.alpha = 0
		this.shootDelayBar.cur.alpha = 0.6
	}

	updateGraphics() {
		this.rectGraphics.x = this.rect.x
		this.rectGraphics.y = this.rect.y
	}

	changeAnim(anim: LayeredAnim, checkSame = true, reset = false) {
		if (anim.anim === this.anim.anim && checkSame) return
		this.anim.rem()
		this.anim.do((s) => s.gotoAndStop(0))
		this.anim = anim
		this.anim.add()
		this.anim.do((s) => {
			if (reset) s.gotoAndPlay(0)
			else s.play()
		})
	}

	lastVel = vec(0, 0)
	vel = vec(0, 0)
	lastStaminaUse = -Infinity
	update(dt: number) {
		/* ---------------------------------- Dead ---------------------------------- */

		/* -------------------------------- Base vel -------------------------------- */
		this.vel.clear()
		if (keyDown("KeyW")) this.vel.y -= 1
		if (keyDown("KeyS")) this.vel.y += 1
		if (keyDown("KeyA")) this.vel.x -= 1
		if (keyDown("KeyD")) this.vel.x += 1

		const dir = this.vel.asDirection(this.lastVel.asDirection())
		this.vel.scaleSet(dt)

		/* ------------------ Shooting (REVISE LATER // VERY MESSY) ----------------- */
		const shooting = !this.switching && this.attackMode === "bow" && mouseDown(0) && !this.endShoot && this.lastShot + this.shootDelay < app.elapsed && !this.dodging
		const angleToMouse = this.rect.center.angle(app.mousePos)
		const atmDir = angleAsDir(angleToMouse)
		if (this.attackMode !== "bow" || this.switching) {
			this.pulling = false
			this.shootFrame = 0
		}
		if (shooting) {
			let reset = false
			if (!this.pulling) reset = true
			this.pulling = true
			const anim = this.straightShoots[atmDir]
			if (reset) {
				Object.values(this.straightShoots).forEach((a) => {
					a.do((s) => {
						s.gotoAndPlay(0)
						s.animationSpeed = this.pullSpeed
					})
				})
			}

			if (!this.shootReady) anim.do((s) => (s.animationSpeed = (s as any)?.ogSpeed ?? this.pullSpeed))
			if (anim.anim !== this.anim.anim) {
				this.anim.rem()
				this.anim.do((s) => (s.onFrameChange = undefined))
				this.anim.do((s) => s.gotoAndStop(0))
				this.anim = anim
				this.anim.add()
				anim.do((s) => {
					if (this.shootReady && !this.endShoot) s.animationSpeed = 0
					s.gotoAndPlay(this.shootFrame)
				})
			}

			this.anim.do((s) => {
				s.onFrameChange = (f) => {
					this.shootFrame = f
					if (f === STRAIGHT_PAUSE && !this.endShoot) s.animationSpeed = 0
				}
			})
		} else if (this.pulling && this.shootReady) {
			if (this.shootReady) {
				new Arrow(this.rect.center, angleToMouse, 10, this.dmg, 600)

				this.lastShot = app.elapsed
				this.stamina = Math.max(this.stamina - 5, 0)
				this.lastStaminaUse = app.elapsed

				this.changeAnim(this.straightShoots[atmDir])
				this.anim.do((s) => {
					s.animationSpeed = this.pullSpeed * 1.5
					s.loop = false
					s.gotoAndPlay(STRAIGHT_PAUSE)
				})
				this.anim.first.onComplete = () => {
					this.endShoot = false
					console.log("end")
				}
				console.log("shoot")
				this.endShoot = true
			}
			this.pulling = false
			this.shootFrame = 0
		} else {
			this.pulling = false
			this.shootFrame = 0
		}

		// Fix animation speed bug (band-aid)
		if (this.endShoot) {
			Object.values(this.straightShoots).forEach((a) => {
				a.do((s) => {
					s.animationSpeed = this.pullSpeed * 1.5
				})
			})
		}

		// Save for future debugging
		// const animationSpeed = Object.values(this.straightShoots).map((a) => a.first.animationSpeed)
		// console.log(animationSpeed)

		/* ------------------------------- DODGE LOGIC ------------------------------ */
		if (keyDown("Space") && this.stamina > this.dodgeCost && this.lastDodge + this.dodgeCooldown < app.elapsed && !this.endShoot && !this.switching) {
			this.stamina -= this.dodgeCost
			this.lastStaminaUse = app.elapsed
			this.lastDodge = app.elapsed
			this.dodgeAngle = this.vel.isZero() ? dirAsAngle(dir) : this.vel.asAngle()
			this.dodgeDir = dir
		}
		if (this.dodging) {
			this.vel = Vec2.ZERO.project(this.dodgeAngle, this.dodgeSpeed * dt)
			if (!this.switching) {
				if (this.attackMode === "bow") this.changeAnim(this.dodges[dir])
				else this.changeAnim(this.pol_dodges[dir])
			}
		}
		this.iframe = this.dodging

		/* ----------------------------- MOVEMENT LOGIC ----------------------------- */
		if (!this.dodging && !shooting) {
			if (!this.vel.isZero()) {
				/* ------------------------------ SPRINT LOGIC ------------------------------ */
				const cost = 0.5 * dt
				if (keyDown("ShiftLeft") && this.stamina > cost && !this.switching) {
					if (!this.endShoot) this.changeAnim(this.runs[dir])
					this.vel.scaleSet(2.5)
					this.stamina -= cost
					this.lastStaminaUse = app.elapsed
				} else {
					if (!this.endShoot && !this.switching) {
						if (this.attackMode === "bow") this.changeAnim(this.moves[dir])
						else this.changeAnim(this.pol_moves[dir])
					}
				}
			} else {
				if (!this.endShoot && !this.switching) {
					if (this.attackMode === "bow") this.changeAnim(this.idles[dir])
					else this.changeAnim(this.pol_idles[dir])
				}
			}
		}
		if (shooting) {
			this.vel.scaleSet(0.5)
		}

		if (!this.vel.isZero()) this.lastVel = this.vel.clone()

		/* ----------------------- Normalize diagonal movement ---------------------- */
		if (!this.dodging && this.vel.x !== 0 && this.vel.y !== 0) {
			this.vel.scaleSet(0.7071)
		}

		/* ------------------------------ Stamina regen ----------------------------- */
		if (!this.dodging && this.lastStaminaUse + this.staminaRegenCooldown < app.elapsed) {
			const increase = this.vel.isZero() ? this.staminaStandRegen : this.staminaRegen
			this.stamina = Math.min(this.stamina + increase * dt, this.maxStamina)
		}

		/* -------------------------------- Switching ------------------------------- */
		if (keyPressed("KeyV") && !this.switching && this.lastSwitch + this.switchCooldown < app.elapsed) {
			this.switching = true
			console.log("Switching")
			if (this.attackMode === "bow") {
				this.changeAnim(this.sheath[dir])
				this.sheath[dir].first.onComplete = () => {
					this.sheath[dir].first.onComplete = undefined
					this.changeAnim(this.pol_draw[dir])

					this.pol_draw[dir].first.onComplete = () => {
						this.switching = false
						this.lastSwitch = app.elapsed
						this.pol_draw[dir].first.onComplete = undefined
					}
				}
			} else {
				this.changeAnim(this.pol_sheath[dir])
				this.pol_sheath[dir].first.onComplete = () => {
					this.pol_sheath[dir].first.onComplete = undefined
					this.changeAnim(this.draw[dir])

					this.draw[dir].first.onComplete = () => {
						this.switching = false
						this.lastSwitch = app.elapsed
						this.draw[dir].first.onComplete = undefined
					}
				}
			}
			this.attackMode = this.attackMode === "bow" ? "pol" : "bow"
		}

		/* --------------------------------- Updates -------------------------------- */
		this.rect.add(this.vel)
		this.anim.do((s) => {
			s.x = this.rect.x - 24
			s.y = this.rect.y - 24
		})
		this.updateGraphics()

		this.hpBar.update(this.hp)
		this.shieldBar.update(this.shield)
		this.staminaBar.update(this.stamina)
		this.shootDelayBar.update(clamp(this.lastShot + this.shootDelay - app.elapsed, 0, this.shootDelay))

		/* --------------------------------- Testing -------------------------------- */
		if (keyPressed("KeyF")) {
			this.hit(10)
		}
	}
}
