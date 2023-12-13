import { Application } from "pixi.js"

const app = new Application()
document.body.appendChild(app.view as any)

let elapsed = 0.0
app.ticker.add((dt) => {
	elapsed += dt
})
