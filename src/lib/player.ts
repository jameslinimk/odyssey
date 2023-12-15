import { SHOW_HITBOXES, SLOWDOWN, app, cameraContainer, clamp, enemies } from "$lib"
import { Graphics, Rectangle, Sprite, Texture } from "pixi.js"
import { Directions, LayeredAnim, angleAsDir, bird, dirAsAngle, drawLayers } from "./animations.js"
import { Arrow } from "./arrow.js"
import { keyDown, keyPressed, mouseDown, mousePressed } from "./events.js"
import { MAP_SCALE, wallRects } from "./map.js"
import { Vec2, vec } from "./vec2.js"

export const OFFSET_X = 27
export const OFFSET_Y = 19

export const ease = (x: number) => clamp(1 - Math.pow(1 - x, 3), 0, 1)

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

	addVecSet(v: Vec2) {
		this.x += v.x
		this.y += v.y
	}

	addVec(v: Vec2) {
		return new NewRectangle(this.x + v.x, this.y + v.y, this.width, this.height)
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

		this.base.zIndex = 2
		this.cur.zIndex = 3

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
	dmgTaken = 1
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

	hide = false
	staggered = false
	staggerAngle = 0
	endStagger = -Infinity
	maxStagger = 50
	staggerSpeed = 2

	dieDir = Directions.Down
	get die() {
		return this.hp <= 0
	}
	hit(dmg: number, staggerAngle = 0) {
		if (this.iframe || this.lastHit + this.hitCooldown > app.elapsed) return
		if (Math.random() >= 0.8) return this.birdSave()

		dmg *= this.dmgTaken

		this.dieDir = angleAsDir(staggerAngle + Math.PI)
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
		if (this.die) this.hp = 0

		// Stagger
		if (this.staggered || dmg < this.maxHp / 20) return
		this.staggered = true
		this.endStagger = app.elapsed + clamp(dmg / (this.maxHp / 3), 0, 1) * this.maxStagger
		console.log("s", clamp(dmg / (this.maxHp / 3), 0, 1))
		this.staggerAngle = staggerAngle
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
	pullSpeed = 0.15 * SLOWDOWN
	arrow_dmg = 10
	arrow_pierce = 1

	slash_dmg = 5
	slash_pierce = 10
	trust_dmg = 10
	trust_pierce = 2
	attacking = false
	attackAngle = 0
	lastAttack = -Infinity
	attackCooldown = 15
	alreadyHit = new Set<number>()
	attackDelayBar: ProgressBar

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

	rect = NewRectangle.fromCenter(600, 300, 12 * MAP_SCALE, 12 * MAP_SCALE * 2)
	rectGraphics: Sprite | null = null
	idles = Object.fromEntries(
		Object.values(Directions).map((d) => [
			d,
			drawLayers(`idle_${d}`, (s) => {
				s.animationSpeed = 0.08 * SLOWDOWN
				;(s as any).ogSpeed = 0.08 * SLOWDOWN
			}),
		]),
	) as Record<Directions, LayeredAnim>
	pol_idles = Object.fromEntries(
		Object.values(Directions).map((d) => [
			d,
			drawLayers(`pol_idle_${d}`, (s) => {
				s.animationSpeed = 0.08 * SLOWDOWN
				;(s as any).ogSpeed = 0.08 * SLOWDOWN
			}),
		]),
	) as Record<Directions, LayeredAnim>
	moves = Object.fromEntries(
		Object.values(Directions).map((d) => [
			d,
			drawLayers(`move_${d}`, (s) => {
				s.animationSpeed = 0.15 * SLOWDOWN
				;(s as any).ogSpeed = 0.15 * SLOWDOWN
			}),
		]),
	) as Record<Directions, LayeredAnim>
	pol_moves = Object.fromEntries(
		Object.values(Directions).map((d) => [
			d,
			drawLayers(`pol_move_${d}`, (s) => {
				s.animationSpeed = 0.15 * SLOWDOWN
				;(s as any).ogSpeed = 0.15 * SLOWDOWN
			}),
		]),
	) as Record<Directions, LayeredAnim>
	runs = Object.fromEntries(
		Object.values(Directions).map((d) => [
			d,
			drawLayers(`run_${d}`, (s) => {
				s.animationSpeed = 0.15 * SLOWDOWN
				;(s as any).ogSpeed = 0.15 * SLOWDOWN
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
				s.animationSpeed = 0.2 * SLOWDOWN
				s.loop = false
				;(s as any).ogSpeed = 0.2 * SLOWDOWN
			}),
		]),
	) as Record<Directions, LayeredAnim>
	pol_draw = Object.fromEntries(
		Object.values(Directions).map((d) => [
			d,
			drawLayers(`pol_draw_${d}`, (s) => {
				s.animationSpeed = 0.2 * SLOWDOWN
				s.loop = false
				;(s as any).ogSpeed = 0.2 * SLOWDOWN
			}),
		]),
	) as Record<Directions, LayeredAnim>
	sheath = Object.fromEntries(
		Object.values(Directions).map((d) => [
			d,
			drawLayers(`sheath_${d}`, (s) => {
				s.animationSpeed = 0.2 * SLOWDOWN
				s.loop = false
				;(s as any).ogSpeed = 0.2 * SLOWDOWN
			}),
		]),
	) as Record<Directions, LayeredAnim>
	pol_sheath = Object.fromEntries(
		Object.values(Directions).map((d) => [
			d,
			drawLayers(`pol_sheath_${d}`, (s) => {
				s.animationSpeed = 0.2 * SLOWDOWN
				s.loop = false
				;(s as any).ogSpeed = 0.2 * SLOWDOWN
			}),
		]),
	) as Record<Directions, LayeredAnim>
	pol_slash = Object.fromEntries(
		Object.values(Directions).map((d) => [
			d,
			drawLayers(`pol_slash_${d}`, (s) => {
				s.animationSpeed = 0.15 * SLOWDOWN
				s.loop = false
				;(s as any).ogSpeed = 0.15 * SLOWDOWN
			}),
		]),
	) as Record<Directions, LayeredAnim>
	pol_trust_1 = Object.fromEntries(
		Object.values(Directions).map((d) => [
			d,
			drawLayers(`pol_trust_1_${d}`, (s) => {
				s.animationSpeed = 0.1 * SLOWDOWN
				s.loop = false
				;(s as any).ogSpeed = 0.1 * SLOWDOWN
			}),
		]),
	) as Record<Directions, LayeredAnim>
	pol_trust_2 = Object.fromEntries(
		Object.values(Directions).map((d) => [
			d,
			drawLayers(`pol_trust_2_${d}`, (s) => {
				s.animationSpeed = 0.1 * SLOWDOWN
				s.loop = false
				;(s as any).ogSpeed = 0.1 * SLOWDOWN
			}),
		]),
	) as Record<Directions, LayeredAnim>
	dead = Object.fromEntries(
		Object.values(Directions).map((d) => [
			d,
			drawLayers(`dead_${d}`, (s) => {
				s.animationSpeed = 0.05 * SLOWDOWN
				;(s as any).ogSpeed = 0.05 * SLOWDOWN
				s.loop = false
			}),
		]),
	) as Record<Directions, LayeredAnim>
	pol_dead = Object.fromEntries(
		Object.values(Directions).map((d) => [
			d,
			drawLayers(`pol_dead_${d}`, (s) => {
				s.animationSpeed = 0.1 * SLOWDOWN
				s.loop = false
				;(s as any).ogSpeed = 0.1 * SLOWDOWN
			}),
		]),
	) as Record<Directions, LayeredAnim>
	hurt = Object.fromEntries(Object.values(Directions).map((d) => [d, drawLayers(`hurt_${d}`)])) as Record<Directions, LayeredAnim>
	pol_hurt = Object.fromEntries(Object.values(Directions).map((d) => [d, drawLayers(`pol_hurt_${d}`)])) as Record<Directions, LayeredAnim>
	anim = this.idles[Directions.Down]

	constructor() {
		this.changeAnim(this.anim, false)

		if (SHOW_HITBOXES) {
			// Visualizing hitbox
			this.rectGraphics = new Sprite(Texture.WHITE)
			this.rectGraphics.width = this.rect.width
			this.rectGraphics.height = this.rect.height
			this.rectGraphics.alpha = 0.8
			this.rectGraphics.x = this.rect.x
			this.rectGraphics.y = this.rect.y
			this.rectGraphics.zIndex = 2
			cameraContainer.addChild(this.rectGraphics)
		}

		const quiver = Sprite.from("quiver.png")
		quiver.x = 7
		quiver.y = app.renderer.height - 75 - 7
		quiver.width = 75
		quiver.height = 75
		app.stage.addChild(quiver)

		this.shootDelayBar = new ProgressBar(7, app.renderer.height - 75 - 7, 75, 75, this.shootDelay, this.shootDelay, 0x000000, 0x000000)
		this.shootDelayBar.base.alpha = 0
		this.shootDelayBar.cur.alpha = 0.6

		const pol = Sprite.from("pol.png")
		pol.x = 75 + 7
		pol.y = app.renderer.height - 75 - 7
		pol.width = 75
		pol.height = 75
		app.stage.addChild(pol)

		this.attackDelayBar = new ProgressBar(75 + 7, app.renderer.height - 75 - 7, 75, 75, this.attackCooldown, this.attackCooldown, 0x000000, 0x000000)
		this.attackDelayBar.base.alpha = 0
		this.attackDelayBar.cur.alpha = 0.6
	}

	birdOffset = vec(20, -20)
	birdT = 0
	birdSave() {
		bird.animationSpeed = 0.3 * SLOWDOWN
		bird.gotoAndPlay(0)
		bird.anchor.set(0.5, 0.5)
		this.birdT = 0
		bird.zIndex = 2
		cameraContainer.addChild(bird)

		bird.position.set(this.rect.centerX + this.birdOffset.x, this.rect.centerY + this.birdOffset.y)
	}

	birdUpdate(dt: number) {
		this.birdT += dt * 0.03

		const pos = this.rect.center.add(this.birdOffset).lerp(this.rect.center.sub(this.birdOffset), ease(this.birdT))
		bird.position.set(pos.x, pos.y)

		if (this.birdT >= 0.6) {
			bird.stop()
			cameraContainer.removeChild(bird)
		}
	}

	updateGraphics() {
		if (!this.rectGraphics) return
		this.rectGraphics.x = this.rect.x
		this.rectGraphics.y = this.rect.y
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

	lastGod1 = -Infinity

	lastVel = vec(0, 0)
	vel = vec(0, 0)
	lastStaminaUse = -Infinity
	fullyDead = false
	speed = 1
	update(dt: number) {
		/* -------------------------------- Base vel -------------------------------- */
		this.vel.clear()
		if (keyDown("KeyW")) this.vel.y -= 1
		if (keyDown("KeyS")) this.vel.y += 1
		if (keyDown("KeyA")) this.vel.x -= 1
		if (keyDown("KeyD")) this.vel.x += 1

		const dir = this.vel.asDirection(this.lastVel.asDirection())
		this.vel.scaleSet(dt * this.speed)

		/* ---------------------------------- Dead ---------------------------------- */
		if (this.die) {
			this.hpBar.update(this.hp)
			if (this.fullyDead) return
			if (this.changeAnim(this.dead[this.dieDir]) !== "same") {
				this.anim.do((s) => {
					s.x = this.rect.x - OFFSET_X
					s.y = this.rect.y - OFFSET_Y
				})
				this.anim.first.onComplete = () => {
					alert("Fully dead")
					this.fullyDead = true
				}
			}
			return
		}

		/* --------------------------------- Stagger -------------------------------- */
		if (app.elapsed >= this.endStagger) this.staggered = false
		if (this.staggered) {
			this.changeAnim(this.hurt[angleAsDir(this.staggerAngle + Math.PI)])
			this.vel = Vec2.ZERO.project(this.staggerAngle, this.staggerSpeed * dt)
			this.vel.scaleSet(ease((this.endStagger - app.elapsed) / this.maxStagger))
		}

		/* -------------------------------- Spearing -------------------------------- */
		const angleToMouse = this.rect.center.angle(app.mousePos)
		const atmDir = angleAsDir(angleToMouse)
		if (
			this.attackMode === "pol" &&
			!this.staggered &&
			!this.attacking &&
			this.lastAttack + this.attackCooldown < app.elapsed &&
			!this.endShoot &&
			!this.switching &&
			!this.dodging &&
			(mousePressed(0) || mousePressed(2))
		) {
			const an = mousePressed(0) ? this.pol_slash : Math.random() > 0.5 ? this.pol_trust_2 : this.pol_trust_1
			this.stamina = Math.max(this.stamina - (mousePressed(0) ? 2.5 : 5), 0)
			this.lastStaminaUse = app.elapsed
			this.attacking = true
			this.attackAngle = angleToMouse
			this.alreadyHit.clear()
			this.changeAnim(an[atmDir])
			an[atmDir].first.onComplete = () => {
				this.attacking = false
				this.lastAttack = app.elapsed
				an[atmDir].first.onComplete = undefined
			}
		}
		if (this.attacking) {
			const slash = this.anim.anim.includes("slash")
			if (slash) this.vel.projectSet(this.attackAngle, 2 * dt)
			else this.vel.projectSet(this.attackAngle, 3 * dt)

			const hitRect = NewRectangle.fromCenter(this.rect.centerX, this.rect.centerY, slash ? 50 : 25, slash ? 50 : 25)
			hitRect.center = this.rect.center.project(this.attackAngle, slash ? 10 : 20)

			const pierce = slash ? this.slash_pierce : this.trust_pierce
			enemies.forEach((e) => {
				if (this.alreadyHit.size < pierce && !this.alreadyHit.has(e.id) && hitRect.intersects(e.rect)) {
					e.hit(slash ? this.slash_dmg : this.trust_dmg, this.attackAngle)
					this.alreadyHit.add(e.id)
				}
			})

			if (SHOW_HITBOXES) {
				const hitRectGraphics = new Sprite(Texture.WHITE)
				hitRectGraphics.width = hitRect.width
				hitRectGraphics.height = hitRect.height
				hitRectGraphics.alpha = 0.1
				hitRectGraphics.x = hitRect.x
				hitRectGraphics.y = hitRect.y
				hitRectGraphics.zIndex = 2
				cameraContainer.addChild(hitRectGraphics)
				setTimeout(() => {
					hitRectGraphics.destroy()
				}, 100)
			}
		}

		/* ------------------ Shooting (REVISE LATER // VERY MESSY) ----------------- */
		const shooting = !this.staggered && !this.switching && this.attackMode === "bow" && mouseDown(0) && !this.endShoot && this.lastShot + this.shootDelay < app.elapsed && !this.dodging
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
				new Arrow(this.rect.center, angleToMouse, 10, this.arrow_dmg, 600, undefined, false, this.arrow_pierce)

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
					// console.log("end")
				}
				// console.log("shoot")
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
		if (keyDown("Space") && this.stamina > this.dodgeCost && this.lastDodge + this.dodgeCooldown < app.elapsed && !this.endShoot && !this.switching && !this.staggered) {
			this.stamina -= this.dodgeCost
			this.lastStaminaUse = app.elapsed
			this.lastDodge = app.elapsed
			this.dodgeAngle = this.vel.isZero() ? dirAsAngle(dir) : this.vel.asAngle()
			this.dodgeDir = dir
			this.attacking = false
		}
		this.iframe = false
		if (this.dodging && !this.staggered) {
			this.iframe = true
			this.vel = Vec2.ZERO.project(this.dodgeAngle, this.dodgeSpeed * dt)
			if (!this.switching) {
				if (this.attackMode === "bow") this.changeAnim(this.dodges[this.dodgeDir])
				else this.changeAnim(this.pol_dodges[this.dodgeDir])
			}
		}

		/* ----------------------------- MOVEMENT LOGIC ----------------------------- */
		if (!this.dodging && !shooting && !this.staggered && !this.attacking) {
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
		if (shooting || this.attacking) {
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
		if (keyPressed("KeyV") && !this.switching && this.lastSwitch + this.switchCooldown < app.elapsed && !this.staggered) {
			this.switching = true
			this.attacking = false
			this.endShoot = false
			// console.log("Switching")
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

		/* -------------------------------- Collision ------------------------------- */
		const hRect = this.rect.addVec(vec(this.vel.x, 0))
		wallRects.forEach((w) => {
			if (hRect.intersects(w)) {
				if (this.vel.x > 0) {
					this.rect.x = w.x - this.rect.width
				} else if (this.vel.x < 0) {
					this.rect.x = w.x + w.width
				}
				this.vel.x = 0
			}
		})

		const vRect = this.rect.addVec(vec(0, this.vel.y))
		wallRects.forEach((w) => {
			if (vRect.intersects(w)) {
				if (this.vel.y > 0) {
					this.rect.y = w.y - this.rect.height
				} else if (this.vel.y < 0) {
					this.rect.y = w.y + w.height
				}
				this.vel.y = 0
			}
		})

		/* --------------------------------- Updates -------------------------------- */
		this.rect.addVecSet(this.vel)
		this.anim.do((s) => {
			s.x = this.rect.x - OFFSET_X
			s.y = this.rect.y - OFFSET_Y
		})
		this.updateGraphics()
		this.birdUpdate(dt)

		this.hpBar.update(this.hp)
		this.shieldBar.update(this.shield)
		this.staminaBar.update(this.stamina)
		this.shootDelayBar.update(clamp(this.lastShot + this.shootDelay - app.elapsed, 0, this.shootDelay))
		this.attackDelayBar.update(clamp(this.lastAttack + this.attackCooldown - app.elapsed, 0, this.attackCooldown))

		if (this.hide) this.anim.do((s) => (s.alpha = 0))
		else this.anim.do((s) => (s.alpha = 1))

		/* --------------------------------- Testing -------------------------------- */
		if (keyPressed("KeyF")) {
			this.hit(10)
		}
		if (keyPressed("KeyG")) {
			this.hit(85)
		}
	}
}
