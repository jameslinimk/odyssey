import { AnimatedSprite, Application } from "pixi.js"
import { BOW1 } from "./animations.js"

const app = new Application({
	backgroundColor: 0x1099bb,
})
document.body.appendChild(app.view as any)

// let elapsed = 0.0
// app.ticker.add((dt) => {
// 	elapsed += dt
// })

console.log(BOW1.animations)

const anim = new AnimatedSprite(BOW1.animations.draw)
anim.animationSpeed = 0.1666
anim.play()

app.stage.addChild(anim)
