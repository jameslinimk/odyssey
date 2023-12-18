import { DEV, cameraContainer } from "$lib"
import { Sprite, Texture } from "pixi.js"
import { astar, type Graph, type Point } from "./astar.js"
import collision from "./collision.json"
import { NewRectangle } from "./player.js"
import { vec, type Vec2 } from "./vec2.js"

export const MAP_SCALE = 0.75
export const COLLISION_TILE_SIZE = 12 * MAP_SCALE

export const map = Sprite.from("real_map.png")
export const overmap = Sprite.from("real_overmap.png")

map.zIndex = -1
overmap.zIndex = 1

map.scale.set(MAP_SCALE)
overmap.scale.set(MAP_SCALE)

export const wallRects: NewRectangle[] = []

const MAP_WIDTH = 32 * 4
const MAP_HEIGHT = 37 * 4

const graph: Graph = []
for (let i = 0; i < MAP_HEIGHT; i++) {
	const row: (0 | 1)[] = []
	for (let j = 0; j < MAP_WIDTH; j++) {
		row.push(0)
	}
	graph.push(row)
}

export const vecToGraph = (vec: Vec2) => [Math.floor(vec.x / COLLISION_TILE_SIZE), Math.floor(vec.y / COLLISION_TILE_SIZE)] as Point
export const graphToVec = (point: Point) => vec(point[0] * COLLISION_TILE_SIZE, point[1] * COLLISION_TILE_SIZE)

const cache = new Map<string, Vec2[] | null>()
export const astarVec = (start: Vec2, goal: Vec2) => {
	const startGraph = vecToGraph(start)
	const goalGraph = vecToGraph(goal)

	const key = `${startGraph.toString()}${goalGraph.toString()}`
	if (cache.has(key)) return cache.get(key)

	const path = astar(graph, startGraph, goalGraph)
	if (path === null) {
		cache.set(key, null)
		return null
	}

	const p = path.map(graphToVec)
	cache.set(key, p)
	return p
}

export const addMaps = () => {
	collision.forEach(([x, y]) => {
		graph[y][x] = 1
		const rect = new NewRectangle(x * COLLISION_TILE_SIZE, y * COLLISION_TILE_SIZE, COLLISION_TILE_SIZE, COLLISION_TILE_SIZE)
		wallRects.push(rect)

		if (DEV) {
			const rectGraphics = new Sprite(Texture.WHITE)
			rectGraphics.width = rect.width
			rectGraphics.height = rect.height
			rectGraphics.alpha = 0.8
			rectGraphics.x = rect.x
			rectGraphics.y = rect.y
			rectGraphics.zIndex = 2
			cameraContainer.addChild(rectGraphics)
		}
	})

	cameraContainer.addChild(map)
	cameraContainer.addChild(overmap)
}
