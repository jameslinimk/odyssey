import type { ISpritesheetData } from "pixi.js"

const cartesian = (...a: any[]): any[] => a.reduce((a, b) => a.flatMap((d: any) => b.map((e: any) => [d, e].flat())))

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
	Up,
	Down,
	Left,
	Right,
}

const test = (meta: Meta, data: SpritesheetData): ISpritesheetData => {
	if (!meta?.size) throw new Error("No size provided")
	const height = meta.size.h / data.tileSize
	const width = meta.size.w / data.tileSize

	return {
		meta,
		frames: cartesian([Array(width).keys()], [Array(height).keys()]).reduce((acc, cur: [number, number]) => {
			const [x, y] = cur
			acc[cur.toString()] = {
				frame: { x: x * data.tileSize, y: y * data.tileSize, w: data.tileSize, h: data.tileSize },
			}
		}, {}),
		animations: data.animations.reduce(
			(acc, cur) => {
				const { name, start, length } = cur
				Object.keys(Directions).forEach((dir) => {
					acc[`${name}_${dir}`] = []
					for (let j = 0; j < length; j++) {
						acc[`${name}_${dir}`].push(`${start[0] + j}_${start[1]}`)
					}
				})
				return acc
			},
			{} as Record<string, string[]>,
		),
	}
}

test(
	{
		image: "bow_combat/char_a_pBOW1/char_a_pBOW1_0_bas_humn_v00.png",
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
)
