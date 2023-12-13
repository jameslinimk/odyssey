import { Application } from "pixi.js"

const app = new Application()
document.body.appendChild(app.view as any)

let elapsed = 0.0
app.ticker.add((dt) => {
	elapsed += dt
	sprite.x = 100.0 + Math.cos(elapsed / 50.0) * 100.0
})
