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

const layer = (base: string, { data }: Spritesheet<ISpritesheetData>) => {}

export const BOW1 = await parse(
	sheet(
		{
			image: "bow_combat/char_a_pBOW1/char_a_pBOW1_0bas_humn_v00.png",
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
)

export const BOW2 = await parse(
	sheet(
		{
			image: "bow_combat/char_a_pBOW2/char_a_pBOW2_0bas_humn_v00.png",
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
)

export const BOW3 = await parse(
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
)
