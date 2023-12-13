import { Application } from "pixi.js"
import { drawLayers, odysseus } from "./animations.js"

const app = new Application({
	backgroundColor: 0x1099bb,
})
document.body.appendChild(app.view as any)

// let elapsed = 0.0
// app.ticker.add((dt) => {
// 	elapsed += dt
// })

drawLayers("shoot_straight_right", app.stage, odysseus, (s) => {
	s.animationSpeed = 0.1666
	s.play()
	s.loop = false
})

console.log(odysseus)
