# 植物大战僵尸 · Plants vs Zombies

一个使用 **HTML5 Canvas + 原生 JavaScript** 实现的植物大战僵尸小游戏，零依赖、零构建步骤，双击 `index.html` 即可在浏览器中游玩。

## 玩法

- ☀ **收集阳光**：点击天上掉落的阳光，或向日葵产出的阳光来攒阳光。
- 🌱 **种植植物**：选中卡片后点击草坪格子种植，消耗对应阳光。
- 🪏 **铲除植物**：点击铲子后再点击植物即可移除。
- 守住全部波次即获胜；任何僵尸闯入房子（左侧）则失败。

## 植物

| 植物 | 阳光 | 作用 |
| --- | --- | --- |
| 🌻 向日葵 | 50 | 定期产出阳光 |
| 🌱 豌豆射手 | 100 | 向同行僵尸发射豌豆 |
| 🥜 坚果墙 | 50 | 高血量肉盾，阻挡僵尸 |
| 🌿 双发射手 | 200 | 每次发射两颗豌豆 |

## 僵尸

- 🧟 普通僵尸、🧟‍♂️ 路障僵尸（高血量）、🧟‍♀️ 快速僵尸。共 3 波，逐波加强。

## 运行

```bash
# 任选其一
open index.html              # macOS
start index.html             # Windows
python -m http.server 8000   # 然后访问 http://localhost:8000
```

## 项目结构

```
index.html        页面与 HUD
styles.css        样式
js/config.js      游戏配置（植物/僵尸/波次数值）
js/entities.js    实体类（Plant / Zombie / Projectile / Sun）
js/game.js        游戏引擎（状态、主循环、碰撞、波次、渲染）
js/main.js        DOM 与引擎的绑定（卡片、点击、覆盖层）
```
