import { BaseTexture, Spritesheet, type ISpritesheetData } from "pixi.js"

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
	/**
	 * Any points with higher or equal x and y will be skipped
	 */
	skip?: [number, number]
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

	return {
		meta,
		frames: crossNumbers(width, height).reduce(
			(acc, cur) => {
				const [x, y] = cur
				if (data?.skip && x >= data.skip[0] && y >= data.skip[1]) return acc
				acc[cur.toString()] = {
					frame: { x: x * data.tileSize, y: y * data.tileSize, w: data.tileSize, h: data.tileSize },
				}
				return acc
			},
			{} as Record<string, { frame: { x: number; y: number; w: number; h: number } }>,
		),
		animations: data.animations.reduce(
			(acc, cur) => {
				const { name, start, length } = cur
				Object.values(Directions).forEach((dir, i) => {
					acc[`${name}_${dir}`] = []
					for (let j = 0; j < length; j++) {
						acc[`${name}_${dir}`].push(`${start[0] + j}_${start[1] + i}`)
					}
				})
				return acc
			},
			{} as Record<string, string[]>,
		),
	}
}

const parse = async (sheet: ISpritesheetData) => {
	const spritesheet = new Spritesheet(BaseTexture.from(sheet.meta.image!), sheet)
	await spritesheet.parse()
	return spritesheet
}

const BOW1 = await parse(
	sheet(
		{
			image: "bow_combat/char_a_pBOW1/char_a_pBOW1_0_bas_humn_v00.png",
			size: { w: 512, h: 512 },
			scale: 1 as any,
		},
		{
			tileSize: 64,
			skip: [0, 4],
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
)

console.log(BOW1)
