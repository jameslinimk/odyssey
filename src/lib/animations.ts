import { app } from "$lib"
import { AnimatedSprite, BaseTexture, Spritesheet, Texture, type ISpritesheetData, type ISpritesheetFrameData } from "pixi.js"

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

const sheet = (meta: Meta, data: SpritesheetData): ISpritesheetData => {
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
	"6tla": ["bo01", "bo02", "bo03"],
	"7tlb": ["qv01"],
} as const

interface Linfo {
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

const OVER_BOW = new Set([
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
])

const OVER_QUIV = new Set(["draw_up", "parry_up", "dodge_up", "hurt_up", "dead_up", "idle_up", "move_up", "crouch_up", "retreat_up", "lunge_up", "shoot_up_up", "shoot_straight_up"])

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

	if (OVER_BOW.has(animation)) layer.push("6tla")
	else layer.unshift("6tla")

	if (OVER_QUIV.has(animation)) layer.push("7tlb")
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

export const rand = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]

export const randSuitor = () =>
	["0bas", "1out", "4har", "5hat"].reduce((acc, cur) => {
		const type = rand<string>((T_MAP as any)[cur])
		const v = rand<number>((V_MAP as any)[cur][type])
		const skip = cur !== "0bas" && Math.random() < 0.5
		acc[cur] = { type, v, skip }
		return acc
	}, {} as any) as Linfo

const confToPath = (conf: Linfo, page: number, customPage = "") => {
	return `char_a_p${customPage}${page}_0bas_${conf["0bas"].type}_v${pl(conf["0bas"].v)}.png`
}

export const getSheet = (anim: string) => {
	const ONE = ["draw", "parry", "dodge", "hurt", "dead"]
	const TWO = ["idle", "move", "crouch", "retreat", "lunge"]
	const THREE = ["shoot_up", "shoot_straight"]
	const RUN = ["run"]

	anim = anim.split("_").slice(0, -1).join("_")

	if (ONE.includes(anim)) return odysseus_1
	if (TWO.includes(anim)) return odysseus_2
	if (THREE.includes(anim)) return odysseus_3
	if (RUN.includes(anim)) return run
	throw new Error("Unknown animation")
}

const run = await parseAll(
	fullSheets(
		ODYSSEUS_CONF,
		sheet(
			{
				image: `sprites/char_a_p1/${confToPath(ODYSSEUS_CONF, 1)}`,
				format: "RGBA8888",
				size: { w: 512, h: 512 },
				scale: 1 as any,
			},
			{
				tileSize: 64,
				animations: [],
				rawAnimations: [
					{
						frames: [
							[0, 4],
							[1, 4],
							[6, 4],
							[3, 4],
							[4, 4],
							[7, 4],
						],
						name: "run_down",
					},
					{
						frames: [
							[0, 5],
							[1, 5],
							[6, 5],
							[3, 5],
							[4, 5],
							[7, 5],
						],
						name: "run_up",
					},
					{
						frames: [
							[0, 6],
							[1, 6],
							[6, 6],
							[3, 6],
							[4, 6],
							[7, 6],
						],
						name: "run_right",
					},
					{
						frames: [
							[0, 7],
							[1, 7],
							[6, 7],
							[3, 7],
							[4, 7],
							[7, 7],
						],
						name: "run_left",
					},
				],
			},
		),
		["6tla", "7tlb"],
	),
)

const odysseus_1 = await parseAll(
	fullSheets(
		ODYSSEUS_CONF,
		sheet(
			{
				image: `sprites/char_a_pBOW1/${confToPath(ODYSSEUS_CONF, 1, "BOW")}`,
				format: "RGBA8888",
				size: { w: 512, h: 512 },
				scale: 1 as any,
			},
			{
				tileSize: 64,
				animations: [
					{
						start: [0, 0],
						length: 3,
						name: "draw",
					},
					{
						start: [3, 0],
						length: 1,
						name: "parry",
					},
					{
						start: [4, 0],
						length: 1,
						name: "dodge",
					},
					{
						start: [5, 0],
						length: 1,
						name: "hurt",
					},
					{
						start: [6, 0],
						length: 2,
						name: "dead",
					},
				],
			},
		),
	),
)

const odysseus_2 = await parseAll(
	fullSheets(
		ODYSSEUS_CONF,
		sheet(
			{
				image: `sprites/char_a_pBOW2/${confToPath(ODYSSEUS_CONF, 2, "BOW")}`,
				format: "RGBA8888",
				size: { w: 512, h: 512 },
				scale: 1 as any,
			},
			{
				tileSize: 64,
				animations: [
					{
						start: [0, 0],
						length: 4,
						name: "idle",
					},
					{
						start: [4, 0],
						length: 4,
						name: "move",
					},
					{
						start: [0, 4],
						length: 1,
						name: "crouch",
					},
					{
						start: [1, 4],
						length: 1,
						name: "retreat",
					},
					{
						start: [2, 4],
						length: 1,
						name: "lunge",
					},
				],
			},
		),
	),
)

const odysseus_3 = await parseAll(
	fullSheets(
		ODYSSEUS_CONF,
		sheet(
			{
				image: `sprites/char_a_pBOW3/${confToPath(ODYSSEUS_CONF, 3, "BOW")}`,
				format: "RGBA8888",
				size: { w: 512, h: 512 },
				scale: 1 as any,
			},
			{
				tileSize: 64,
				animations: [
					{
						start: [0, 0],
						length: 8,
						name: "shoot_up",
					},
					{
						start: [0, 4],
						length: 8,
						name: "shoot_straight",
					},
				],
			},
		),
	),
)
