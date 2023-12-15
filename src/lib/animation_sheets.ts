import { confToPath, sheet, type Linfo } from "./animations.js"

export const p1Sheet = (conf: Linfo) =>
	sheet(
		{
			image: `sprites/char_a_p1/${confToPath(conf, 1)}`,
			format: "RGBA8888",
			size: { w: 512, h: 512 },
			scale: 1 as any,
		},
		{
			tileSize: 64,
			animations: [
				{
					start: [0, 4],
					length: 6,
					name: "walk",
				},
				{
					start: [0, 0],
					length: 1,
					name: "stand",
				},
			],
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
	)
export const p1BowSheet = (conf: Linfo) =>
	sheet(
		{
			image: `sprites/char_a_pBOW1/${confToPath(conf, 1, "BOW")}`,
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
			rawAnimations: [
				{
					frames: [
						[2, 0],
						[1, 0],
						[0, 0],
					],
					name: "sheath_down",
				},
				{
					frames: [
						[2, 1],
						[1, 1],
						[0, 1],
					],
					name: "sheath_up",
				},
				{
					frames: [
						[2, 2],
						[1, 2],
						[0, 2],
					],
					name: "sheath_right",
				},
				{
					frames: [
						[2, 3],
						[1, 3],
						[0, 3],
					],
					name: "sheath_left",
				},
			],
		},
	)
export const p2BowSheet = (conf: Linfo) =>
	sheet(
		{
			image: `sprites/char_a_pBOW2/${confToPath(conf, 2, "BOW")}`,
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
	)
export const p3BowSheet = (conf: Linfo) =>
	sheet(
		{
			image: `sprites/char_a_pBOW3/${confToPath(conf, 3, "BOW")}`,
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
	)
export const p1PolSheet = (conf: Linfo) =>
	sheet(
		{
			image: `sprites/char_a_pPOL1/${confToPath(conf, 1, "POL")}`,
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
					name: "pol_draw",
				},
				{
					start: [3, 0],
					length: 1,
					name: "pol_parry",
				},
				{
					start: [4, 0],
					length: 1,
					name: "pol_dodge",
				},
				{
					start: [5, 0],
					length: 1,
					name: "pol_hurt",
				},
				{
					start: [6, 0],
					length: 2,
					name: "pol_dead",
				},
			],
			rawAnimations: [
				{
					frames: [
						[2, 0],
						[1, 0],
						[0, 0],
					],
					name: "pol_sheath_down",
				},
				{
					frames: [
						[2, 1],
						[1, 1],
						[0, 1],
					],
					name: "pol_sheath_up",
				},
				{
					frames: [
						[2, 2],
						[1, 2],
						[0, 2],
					],
					name: "pol_sheath_right",
				},
				{
					frames: [
						[2, 3],
						[1, 3],
						[0, 3],
					],
					name: "pol_sheath_left",
				},
			],
		},
	)
export const p2PolSheet = (conf: Linfo) =>
	sheet(
		{
			image: `sprites/char_a_pPOL2/${confToPath(conf, 2, "POL")}`,
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
					name: "pol_idle",
				},
				{
					start: [4, 0],
					length: 4,
					name: "pol_move",
				},
				{
					start: [0, 4],
					length: 1,
					name: "pol_crouch",
				},
				{
					start: [1, 4],
					length: 1,
					name: "pol_retreat",
				},
				{
					start: [2, 4],
					length: 1,
					name: "pol_lunge",
				},
			],
		},
	)
export const p3PolSheet = (conf: Linfo) =>
	sheet(
		{
			image: `sprites/char_a_pPOL3/${confToPath(conf, 3, "POL")}`,
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
					name: "pol_slash",
				},
				{
					start: [0, 4],
					length: 3,
					name: "pol_trust_1",
				},
				{
					start: [3, 4],
					length: 3,
					name: "pol_trust_2",
				},
			],
		},
	)
