import PriorityQueue from "tinyqueue"

export type Graph = (0 | 1)[][]
export type Point = [number, number]

class Node {
	constructor(
		public point: Point,
		public cost: number,
		public heuristic: number,
		public parent?: Node,
	) {}

	get fCost(): number {
		return this.cost + this.heuristic
	}
}

function manhattanDistance(a: Point, b: Point): number {
	return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1])
}

function getNeighbors(point: Point, graph: Graph): Point[] {
	const [x, y] = point
	const neighbors: Point[] = []
	const directions: Point[] = [
		[1, 0],
		[0, 1],
		[-1, 0],
		[0, -1],
	] // Right, Down, Left, Up

	for (const [dx, dy] of directions) {
		const newX = x + dx
		const newY = y + dy
		if (newX >= 0 && newY >= 0 && newX < graph[0].length && newY < graph.length && !graph[newY][newX]) {
			neighbors.push([newX, newY])
		}
	}

	return neighbors
}

export function astar(graph: Graph, start: Point, goal: Point): Point[] | null {
	const openSet = new PriorityQueue<Node>(undefined, (a, b) => a.fCost - b.fCost)
	openSet.push(new Node(start, 0, manhattanDistance(start, goal)))

	const cameFrom = new Map<string, Node>()

	while (openSet.length > 0) {
		const current = openSet.pop()!

		if (current.point[0] === goal[0] && current.point[1] === goal[1]) {
			return reconstructPath(current)
		}

		for (const neighbor of getNeighbors(current.point, graph)) {
			const tentativeCost = current.cost + 1 // Assuming uniform cost

			if (!cameFrom.has(neighbor.toString()) || tentativeCost < cameFrom.get(neighbor.toString())!.cost) {
				const neighborNode = new Node(neighbor, tentativeCost, manhattanDistance(neighbor, goal), current)
				cameFrom.set(neighbor.toString(), neighborNode)
				openSet.push(neighborNode)
			}
		}
	}

	return null // Path not found
}

function reconstructPath(current: Node): Point[] {
	const totalPath: Point[] = [current.point]
	while (current.parent) {
		current = current.parent
		totalPath.unshift(current.point)
	}
	return totalPath
}

// Example usage
const graph: Graph = [
	[0, 0, 0],
	[0, 1, 1],
	[0, 1, 0],
]
const start: Point = [0, 0]
const goal: Point = [2, 2]

const path = astar(graph, start, goal)
console.log(path)
