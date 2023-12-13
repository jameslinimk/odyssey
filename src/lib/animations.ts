import { AnimatedSprite, BaseTexture, Container, Spritesheet, Texture, type ISpritesheetData, type ISpritesheetFrameData } from "pixi.js"

const cross = <T, U>(a: T[], b: U[]) => {
	const result = []
	for (let i = 0; i < a.length; i++) {
		for (let j = 0; j < b.length; j++) {
			result.push([a[i], b[j]])
		}
	}
	return result as [T, U][]
}

const crossNumbers = (w: number, h: number) => cross([...Array(w).keys()], [...Array(h).keys()])

interface SpritesheetData {
	tileSize: number
	animations: {
		start: [number, number]
		length: number
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

enum Directions {
	Down = "down",
	Up = "up",
	Right = "right",
	Left = "left",
}

const sheet = (meta: Meta, data: SpritesheetData): ISpritesheetData => {
	if (!meta?.size) throw new Error("No size provided")
	const height = meta.size.h / data.tileSize
	const width = meta.size.w / data.tileSize

	const used = new Set<string>()
	const animations = data.animations.reduce(
		(acc, cur) => {
			const { name, start, length } = cur
			Object.values(Directions).forEach((dir, i) => {
				acc[`${name}_${dir}`] = []
				for (let j = 0; j < length; j++) {
					const s = `${start[0] + j},${start[1] + i}`
					acc[`${name}_${dir}`].push(`${meta.image!}_${s}`)
					used.add(s)
				}
			})
			return acc
		},
		{} as Record<string, string[]>,
	)

	return {
		meta,
		frames: crossNumbers(width, height).reduce(
			(acc, cur) => {
				const [x, y] = cur
				if (!used.has(cur.toString())) return acc
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

export const LAYERS = ["0bas", "1out", "4har", "6tla", "7tlb"] as const
export const V_MAP = {
	"0bas": [0],
	"1out": [1],
	"4har": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
	"6tla": [1, 2, 3, 4, 5],
	"7tlb": [1, 2, 3, 4, 5, 6, 7, 8],
} as const
export const T_MAP = {
	"0bas": ["humn"],
	"1out": ["boxr", "undi"],
	"4har": ["bob1", "dap1"],
	"6tla": ["bo01", "bo02", "bo03"],
	"7tlb": ["qv01"],
} as const

interface Linfo {
	"0bas": {
		type: (typeof T_MAP)["0bas"][number]
		v: (typeof V_MAP)["0bas"][number]
	}
	"1out": {
		type: (typeof T_MAP)["1out"][number]
		v: (typeof V_MAP)["1out"][number]
	}
	"4har": {
		type: (typeof T_MAP)["4har"][number]
		v: (typeof V_MAP)["4har"][number]
	}
	"6tla": {
		type: (typeof T_MAP)["6tla"][number]
		v: (typeof V_MAP)["6tla"][number]
	}
	"7tlb": {
		type: (typeof T_MAP)["7tlb"][number]
		v: (typeof V_MAP)["7tlb"][number]
	}
}

const fullSheets = (info: Linfo, data: ISpritesheetData) => {
	const sheets = {} as Record<(typeof LAYERS)[number], ISpritesheetData>
	const baseFolder = data.meta.image!.split("/").slice(0, -1).join("/")
	const baseName = data.meta.image!.split("/").slice(-1)[0].split(".")[0].split("_0bas")[0]
	LAYERS.forEach((l) => {
		const { type, v } = info[l]
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

class LayeredAnim {
	anims: AnimatedSprite[] = []
	constructor(layers: Texture[][], stage: Container, caller?: (sprite: AnimatedSprite) => any) {
		for (const layer of layers) {
			const anim = new AnimatedSprite(layer)
			if (caller) caller(anim)
			this.anims.push(anim)
			stage.addChild(anim)
		}
	}

	get first() {
		return this.anims[0]
	}

	do(caller: (sprite: AnimatedSprite) => any) {
		this.anims.forEach((s) => caller(s))
	}
}

export const drawLayers = (animation: string, stage: Container, data: typeof odysseus, caller?: (sprite: AnimatedSprite) => any) => {
	const layer = ["0bas", "1out", "4har"]

	if (OVER_BOW.has(animation)) layer.push("6tla")
	else layer.unshift("6tla")

	if (OVER_QUIV.has(animation)) layer.push("7tlb")
	else layer.unshift("7tlb")

	return new LayeredAnim(
		layer.map((l) => data[l as (typeof LAYERS)[number]].animations[animation]),
		stage,
		caller,
	)
}

export const odysseus = await parseAll(
	fullSheets(
		{
			"0bas": { type: "humn", v: 0 },
			"1out": { type: "boxr", v: 1 },
			"4har": { type: "dap1", v: 3 },
			"6tla": { type: "bo03", v: 1 },
			"7tlb": { type: "qv01", v: 1 },
		},
		sheet(
			{
				image: "bow_combat/char_a_pBOW3/char_a_pBOW3_0bas_humn_v00.png",
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

// export const BOW1 = await parse(
// 	sheet(
// 		{
// 			image: "bow_combat/char_a_pBOW1/char_a_pBOW1_0bas_humn_v00.png",
// 			format: "RGBA8888",
// 			size: { w: 512, h: 512 },
// 			scale: 1 as any,
// 		},
// 		{
// 			tileSize: 64,
// 			animations: [
// 				{
// 					start: [0, 0],
// 					length: 3,
// 					name: "draw",
// 				},
// 				{
// 					start: [3, 0],
// 					length: 1,
// 					name: "parry",
// 				},
// 				{
// 					start: [4, 0],
// 					length: 1,
// 					name: "dodge",
// 				},
// 				{
// 					start: [5, 0],
// 					length: 1,
// 					name: "hurt",
// 				},
// 				{
// 					start: [6, 0],
// 					length: 2,
// 					name: "dead",
// 				},
// 			],
// 		},
// 	),
// )

// export const BOW2 = await parse(
// 	sheet(
// 		{
// 			image: "bow_combat/char_a_pBOW2/char_a_pBOW2_0bas_humn_v00.png",
// 			format: "RGBA8888",
// 			size: { w: 512, h: 512 },
// 			scale: 1 as any,
// 		},
// 		{
// 			tileSize: 64,
// 			animations: [
// 				{
// 					start: [0, 0],
// 					length: 4,
// 					name: "idle",
// 				},
// 				{
// 					start: [4, 0],
// 					length: 4,
// 					name: "move",
// 				},
// 				{
// 					start: [0, 4],
// 					length: 1,
// 					name: "crouch",
// 				},
// 				{
// 					start: [1, 4],
// 					length: 1,
// 					name: "retreat",
// 				},
// 				{
// 					start: [2, 4],
// 					length: 1,
// 					name: "lunge",
// 				},
// 			],
// 		},
// 	),
// )

// export const BOW3 = await parse(
// 	sheet(
// 		{
// 			image: "bow_combat/char_a_pBOW3/char_a_pBOW3_0bas_humn_v00.png",
// 			format: "RGBA8888",
// 			size: { w: 512, h: 512 },
// 			scale: 1 as any,
// 		},
// 		{
// 			tileSize: 64,
// 			animations: [
// 				{
// 					start: [0, 0],
// 					length: 8,
// 					name: "shoot_up",
// 				},
// 				{
// 					start: [0, 4],
// 					length: 8,
// 					name: "shoot_straight",
// 				},
// 			],
// 		},
// 	),
// )
