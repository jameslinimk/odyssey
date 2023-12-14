import { app } from "$lib"
import { AnimatedSprite, BaseTexture, Spritesheet, Texture, type ISpritesheetData, type ISpritesheetFrameData } from "pixi.js"
import { p1BowSheet, p1PolSheet, p1Sheet, p2BowSheet, p2PolSheet, p3BowSheet, p3PolSheet } from "./animation_sheets.js"

interface SpritesheetData {
	tileSize: number
	animations: {
		start: [number, number]
		length: number
		name: string
	}[]
	rawAnimations?: {
		frames: [number, number][]
		name: string
	}[]
}

interface Meta {
	app?: string
	format?: string
	frameTags?: {
		from: number
		name: string
		to: number
		direction: string
	}[]
	image?: string
	layers?: {
		blendMode: string
		name: string
		opacity: number
	}[]
	scale: string
	size?: {
		h: number
		w: number
	}
	slices?: {
		color: string
		name: string
		keys: {
			frame: number
			bounds: {
				x: number
				y: number
				w: number
				h: number
			}
		}[]
	}[]
	related_multi_packs?: string[]
	version?: string
}

export enum Directions {
	Down = "down",
	Up = "up",
	Right = "right",
	Left = "left",
}

export const dirAsAngle = (dir: Directions) => {
	switch (dir) {
		case Directions.Right:
			return 0
		case Directions.Down:
			return Math.PI / 2
		case Directions.Left:
			return Math.PI
		case Directions.Up:
			return (3 * Math.PI) / 2
	}
}

export const radiansToDegrees = (radians: number) => (radians * 180) / Math.PI

export const angleAsDir = (angle: number) => {
	if (-(Math.PI / 4) <= angle && angle <= Math.PI / 4) return Directions.Right
	if (Math.PI / 4 <= angle && angle <= (Math.PI * 3) / 4) return Directions.Down
	if (((Math.PI * 3) / 4 <= angle && angle <= Math.PI) || (-Math.PI <= angle && angle <= -((Math.PI * 3) / 4))) return Directions.Left
	return Directions.Up
}

export const sheet = (meta: Meta, data: SpritesheetData): ISpritesheetData => {
	if (!meta?.size) throw new Error("No size provided")

	const used: [number, number][] = []
	const animations = data.animations.reduce(
		(acc, cur) => {
			const { name, start, length } = cur
			Object.values(Directions).forEach((dir, i) => {
				acc[`${name}_${dir}`] = []
				for (let j = 0; j < length; j++) {
					const s: [number, number] = [start[0] + j, start[1] + i]
					acc[`${name}_${dir}`].push(`${meta.image!}_${s.toString()}`)
					used.push(s)
				}
			})
			return acc
		},
		{} as Record<string, string[]>,
	)
	if (data.rawAnimations) {
		data.rawAnimations.forEach((anim) => {
			const { name, frames } = anim
			animations[name] = frames.map((f) => `${meta.image!}_${f.toString()}`)
			used.push(...frames)
		})
	}

	return {
		meta,
		frames: used.reduce(
			(acc, cur) => {
				const [x, y] = cur
				acc[`${meta.image!}_${cur.toString()}`] = {
					frame: { x: x * data.tileSize, y: y * data.tileSize, w: data.tileSize, h: data.tileSize },
					sourceSize: { w: data.tileSize, h: data.tileSize },
					spriteSourceSize: { x: 0, y: 0, w: data.tileSize, h: data.tileSize },
					rotated: false,
					trimmed: false,
				}
				return acc
			},
			{} as Record<string, ISpritesheetFrameData>,
		),
		animations,
	}
}

const parse = async (sheet: ISpritesheetData) => {
	const spritesheet = new Spritesheet<any>(BaseTexture.from(sheet.meta.image!), sheet)
	await spritesheet.parse()
	return spritesheet
}

const parseAll = async <T extends string>(sheets: Record<T, ISpritesheetData>): Promise<Record<T, Spritesheet<any>>> => {
	const spritesheets = Object.entries(sheets).map(([k, v]: any) => parse(v).then((s) => [k, s]))
	return Object.fromEntries(await Promise.all(spritesheets))
}

const pl = (n: number) => n.toString().padStart(2, "0")

export const LAYERS = ["0bas", "1out", "4har", "5hat", "6tla", "7tlb"] as const
export const V_MAP = {
	"0bas": {
		humn: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
	},
	"1out": {
		boxr: [1],
		undi: [1],
		pfpn: [1, 2, 3, 4, 5],
		fstr: [1, 2, 3, 4, 5],
	},
	"4har": {
		bob1: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
		dap1: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
	},
	"5hat": {
		pfht: [1, 2, 3, 4, 5],
		pnty: [1, 2, 3, 4, 5],
	},
	"6tla": {
		bo01: [1, 2, 3, 4, 5],
		bo02: [1, 2, 3, 4, 5],
		bo03: [1, 2, 3, 4, 5],
		hb01: [1, 2, 3, 4, 5],
		sp01: [1, 2, 3, 4, 5],
		sp02: [1, 2, 3, 4, 5],
	},
	"7tlb": {
		qv01: [1, 2, 3, 4, 5, 6, 7, 8],
	},
} as const
export const T_MAP = {
	"0bas": ["humn"],
	"1out": ["boxr", "undi", "pfpn", "fstr"],
	"4har": ["bob1", "dap1"],
	"5hat": ["pfht", "pnty"],
	"6tla": ["bo01", "bo02", "bo03", "hb01", "sp01", "sp02"],
	"7tlb": ["qv01"],
} as const

export interface Linfo {
	"0bas": {
		skip?: boolean
		type: (typeof T_MAP)["0bas"][number]
		v: number
	}
	"1out": {
		skip?: boolean
		type: (typeof T_MAP)["1out"][number]
		v: number
	}
	"4har": {
		skip?: boolean
		type: (typeof T_MAP)["4har"][number]
		v: number
	}
	"5hat": {
		skip?: boolean
		type: (typeof T_MAP)["5hat"][number]
		v: number
	}
	"6tla": {
		skip?: boolean
		type: (typeof T_MAP)["6tla"][number]
		v: number
	}
	"7tlb": {
		skip?: boolean
		type: (typeof T_MAP)["7tlb"][number]
		v: number
	}
}

export const checkLInfo = (info: Linfo) => {
	const errors = [] as string[]
	LAYERS.forEach((l) => {
		const { type, v } = info[l]
		if (!(T_MAP[l] as any).includes(type)) errors.push(`Invalid type ${type} for layer ${l}`)
		if (!(V_MAP[l] as any)[type].includes(v)) errors.push(`Invalid variant ${v} for layer ${l} and type ${type}`)
	})
	if (errors.length) throw new Error(errors.join("\n"))
}

const fullSheets = (info: Linfo, data: ISpritesheetData, skips: (typeof LAYERS)[number][] = []) => {
	const sheets = {} as Record<(typeof LAYERS)[number], ISpritesheetData>
	const baseFolder = data.meta.image!.split("/").slice(0, -1).join("/")
	const baseName = data.meta.image!.split("/").slice(-1)[0].split(".")[0].split("_0bas")[0]
	LAYERS.forEach((l) => {
		const { type, v, skip } = info[l]
		if (skips.includes(l)) return
		if (skip) return

		sheets[l] = {
			...data,
			meta: {
				...data.meta,
				image: l === "0bas" ? `${baseFolder}/${baseName}_${l}_${type}_v${pl(v)}.png` : `${baseFolder}/${l}/${baseName}_${l}_${type}_v${pl(v)}.png`,
			},
		}
	})
	return sheets
}

const OVER_6_LAYER = new Set([
	"draw_down",
	"draw_up",
	"parry_down",
	"dodge_down",
	"idle_down",
	"move_down",
	"crouch_down",
	"retreat_down",
	"shoot_up_down",
	"shoot_up_right",
	"shoot_up_left",
	"shoot_straight_down",
	"shoot_straight_right",
	"shoot_straight_left",
	"pol_draw_down",
	"pol_draw_left",
	"pol_draw_right",
	"pol_parry_down",
	"pol_dodge_down",
	"pol_dodge_up",
	"pol_dodge_left",
	"pol_dodge_right",
	"pol_hurt_up",
	"pol_hurt_left",
	"pol_hurt_right",
	"pol_dead_up",
	"pol_dead_left",
	"pol_dead_right",
	"pol_idle_down",
	"pol_idle_left",
	"pol_idle_right",
	"pol_move_down",
	"pol_move_left",
	"pol_move_right",
	"pol_crouch_down",
	"pol_crouch_left",
	"pol_crouch_right",
	"pol_retreat_down",
	"pol_retreat_left",
	"pol_retreat_right",
	"pol_lunge_down",
	"pol_lunge_left",
	"pol_lunge_right",
	"pol_slash_right",
	"pol_slash_left",
	"pol_trust_1_down",
	"pol_trust_2_down",
	"pol_trust_1_left",
	"pol_trust_2_left",
	"pol_trust_1_right",
	"pol_trust_2_right",
])

const OVER_7_LAYER = new Set(["draw_up", "parry_up", "dodge_up", "hurt_up", "dead_up", "idle_up", "move_up", "crouch_up", "retreat_up", "lunge_up", "shoot_up_up", "shoot_straight_up"])

export class LayeredAnim {
	anims: AnimatedSprite[] = []
	constructor(
		public anim: string,
		layers: Texture[][],
		caller?: (sprite: AnimatedSprite) => any,
	) {
		for (const layer of layers) {
			const anim = new AnimatedSprite(layer)
			if (caller) caller(anim)
			this.anims.push(anim)
		}
	}

	get first() {
		return this.anims[0]
	}

	do(caller: (sprite: AnimatedSprite) => any) {
		this.anims.forEach((s) => caller(s))
	}

	add() {
		this.do((s) => app.stage.addChild(s))
	}

	rem() {
		this.do((s) => app.stage.removeChild(s))
	}
}

export const drawLayers = (animation: string, caller?: (sprite: AnimatedSprite) => any) => {
	const data = getSheet(animation)
	const skips: string[] = LAYERS.filter((l) => !Object.keys(data).includes(l))
	const layer = ["0bas", "1out", "4har", "5hat"]

	if (OVER_6_LAYER.has(animation)) layer.push("6tla")
	else layer.unshift("6tla")

	if (OVER_7_LAYER.has(animation)) layer.push("7tlb")
	else layer.unshift("7tlb")

	return new LayeredAnim(
		animation,
		layer.filter((l) => !skips.includes(l)).map((l) => data[l as (typeof LAYERS)[number]].animations[animation]),
		caller,
	)
}

const ODYSSEUS_CONF: Linfo = {
	"0bas": { type: "humn", v: 1 },
	"1out": { type: "fstr", v: 1 },
	"4har": { type: "dap1", v: 3 },
	"5hat": { type: "pnty", v: 1 },
	"6tla": { type: "bo03", v: 1 },
	"7tlb": { type: "qv01", v: 1 },
}

const POL_ODY_CONF: Linfo = {
	...ODYSSEUS_CONF,
	"6tla": { type: "sp02", v: 1 },
	"7tlb": { type: "qv01", v: 1, skip: true },
}

export const rand = <T>(arr: T[]) => arr[iRand(0, arr.length - 1)]
export const iRand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

export const randSuitor = (extra?: "pol" | "bow") => {
	const base = ["0bas", "1out", "4har", "5hat"].reduce((acc, cur) => {
		const type = rand<string>((T_MAP as any)[cur])
		const v = rand<number>((V_MAP as any)[cur][type])
		const skip = cur !== "0bas" && Math.random() < 0.5
		acc[cur] = { type, v, skip }
		return acc
	}, {} as any) as Linfo

	if (!extra) return base
	if (extra === "pol") {
		base["6tla"] = { type: rand(["hb01", "sp01", "sp02"]), v: iRand(1, 5) }
	} else {
		base["6tla"] = { type: rand(["bo01", "bo02", "bo03"]), v: iRand(1, 5) }
		base["7tlb"] = { type: "qv01", v: iRand(1, 8) }
	}

	return base
}

export const confToPath = (conf: Linfo, page: number, customPage = "") => {
	return `char_a_p${customPage}${page}_0bas_${conf["0bas"].type}_v${pl(conf["0bas"].v)}.png`
}

export const getSheet = (anim: string) => {
	const ONE = ["draw", "parry", "dodge", "hurt", "dead", "sheath"]
	const TWO = ["idle", "move", "crouch", "retreat", "lunge"]
	const THREE = ["shoot_up", "shoot_straight"]
	const RUN = ["run"]
	const POL_ONE = ONE.map((a) => `pol_${a}`)
	const POL_TWO = TWO.map((a) => `pol_${a}`)
	const POL_THREE = ["pol_slash", "pol_trust_1", "pol_trust_2"]

	anim = anim.split("_").slice(0, -1).join("_")

	if (ONE.includes(anim)) return pBow1
	if (TWO.includes(anim)) return pBow2
	if (THREE.includes(anim)) return pBow3
	if (RUN.includes(anim)) return p1
	if (POL_ONE.includes(anim)) return pPol1
	if (POL_TWO.includes(anim)) return pPol2
	if (POL_THREE.includes(anim)) return pPol3
	throw new Error("Unknown animation")
}

const p1 = await parseAll(fullSheets(ODYSSEUS_CONF, p1Sheet(ODYSSEUS_CONF), ["6tla", "7tlb"]))

const pBow1 = await parseAll(fullSheets(ODYSSEUS_CONF, p1BowSheet(ODYSSEUS_CONF)))
const pBow2 = await parseAll(fullSheets(ODYSSEUS_CONF, p2BowSheet(ODYSSEUS_CONF)))
const pBow3 = await parseAll(fullSheets(ODYSSEUS_CONF, p3BowSheet(ODYSSEUS_CONF)))

const pPol1 = await parseAll(fullSheets(POL_ODY_CONF, p1PolSheet(POL_ODY_CONF)))
const pPol2 = await parseAll(fullSheets(POL_ODY_CONF, p2PolSheet(POL_ODY_CONF)))
const pPol3 = await parseAll(fullSheets(POL_ODY_CONF, p3PolSheet(POL_ODY_CONF)))
