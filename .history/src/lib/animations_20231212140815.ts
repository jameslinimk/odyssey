import { BaseTexture, Spritesheet, type ISpritesheetData, type ISpritesheetFrameData } from "pixi.js"

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
	Up = "up",
	Down = "down",
	Left = "left",
	Right = "right",
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
					acc[`${name}_${dir}`].push(s)
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
				acc[cur.toString()] = {
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

const pl = (n: number) => n.toString().padStart(2, "0")

export const layers = ["0bas", "1out", "4har", "6tla", "7tlb"] as const
export const vMap = {
	"0bas": [0],
	"1out": [1],
	"4har": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
	"6tla": [1, 2, 3, 4, 5],
	"7tlb": [1, 2, 3, 4, 5, 6, 7, 8],
} as const
export const tMap = {
	"0bas": ["humn"],
	"1out": ["boxr", "undi"],
	"4har": ["bob1", "dap1"],
	"6tla": ["bo01", "bo02", "bo03"],
	"7tlb": ["qv01"],
} as const

interface Linfo {
	"0bas": {
		type: (typeof tMap)["0bas"][number]
		v: (typeof vMap)["0bas"][number]
	}
	"1out": {
		type: (typeof tMap)["1out"][number]
		v: (typeof vMap)["1out"][number]
	}
	"4har": {
		type: (typeof tMap)["4har"][number]
		v: (typeof vMap)["4har"][number]
	}
	"6tla": {
		type: (typeof tMap)["6tla"][number]
		v: (typeof vMap)["6tla"][number]
	}
	"7tlb": {
		type: (typeof tMap)["7tlb"][number]
		v: (typeof vMap)["7tlb"][number]
	}
}

const fullSheets = (info: Linfo, data: ISpritesheetData) => {
	const sheets: ISpritesheetData[] = []
	const baseFolder = data.meta.image!.split("/").slice(0, -1).join("/")
	const baseName = data.meta.image!.split("/").slice(-1)[0].split(".")[0].split("_0bas")[0]
	layers.forEach((l) => {
		const { type, v } = info[l]
		sheets.push({
			...data,
			meta: {
				...data.meta,
				image: l === "0bas" ? `${baseFolder}/${baseName}_${l}_${type}_v${pl(v)}.png` : `${baseFolder}/${l}/${baseName}_${l}_${type}_v${pl(v)}.png`,
			},
		})
	})
	return sheets
}

const s = fullSheets(
	{
		"0bas": { type: "humn", v: 0 },
		"1out": { type: "boxr", v: 1 },
		"4har": { type: "bob1", v: 1 },
		"6tla": { type: "bo01", v: 1 },
		"7tlb": { type: "qv01", v: 1 },
	},
	sheet(
		{
			image: "bow_combat/char_a_pBOW3/char_a_pBOW3_0bas_humn_v00.png",
			format: "RGBA8888",
			size: { w: 512, h: 512 },
			scale: "1",
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
)

console.log(s)

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
