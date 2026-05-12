/**
 * Oxion Web Runtime Template (v2 - Robust & Camera Support)
 */

export const generateWebHTML = (project: any, useLocalMatter: boolean = false) => {
  const projectJSON = JSON.stringify(project);
  const matterScript = useLocalMatter 
    ? '<script src="./matter.min.js"></script>'
    : '<script src="https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js"></script>';
  
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>${project.name || 'Oxion Game'}</title>
    ${matterScript}
    <style>
        body { margin: 0; padding: 0; background: #000; overflow: hidden; display: flex; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif; }
        #game-container { position: relative; width: 100vw; height: 100vh; background: #000; }
        canvas { display: block; image-rendering: pixelated; }
        #ui-layer { position: absolute; top: 20px; left: 20px; pointer-events: none; color: white; font-size: 20px; text-shadow: 2px 2px 0 black; font-family: monospace; }
        #controls { position: absolute; bottom: 40px; left: 0; right: 0; display: flex; justify-content: space-around; padding: 0 40px; }
        .btn { width: 80px; height: 80px; background: rgba(255,255,255,0.1); border-radius: 16px; display: flex; justify-content: center; align-items: center; color: white; font-size: 32px; user-select: none; border: 2px solid rgba(255,255,255,0.2); backdrop-filter: blur(4px); }
        .btn:active { background: rgba(255,255,255,0.3); transform: scale(0.95); }
        #loading-screen { position: absolute; inset: 0; background: #000; display: flex; flex-direction: column; justify-content: center; align-items: center; color: #fff; z-index: 100; }
        .spinner { width: 40px; height: 40px; border: 4px solid #333; border-top-color: #00ff88; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 20px; }
        @keyframes spin { to { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div id="loading-screen">
        <div class="spinner"></div>
        <div id="loading-text">Initializing Engine...</div>
    </div>

    <div id="game-container">
        <canvas id="gameCanvas"></canvas>
        <div id="ui-layer"></div>
        <div id="controls">
            <div style="display: flex; gap: 24px;">
                <div class="btn" id="btn-left">←</div>
                <div class="btn" id="btn-right">→</div>
            </div>
            <div class="btn" id="btn-jump">↑</div>
        </div>
    </div>

    <script>
        const project = ${projectJSON};
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const uiLayer = document.getElementById('ui-layer');
        const loadingScreen = document.getElementById('loading-screen');

        const Engine = Matter.Engine, Bodies = Matter.Bodies, Composite = Matter.Composite, Events = Matter.Events;
        const engine = Engine.create();
        const world = engine.world;

        let currentRoom = project.rooms.find(r => r.id === project.mainRoomId) || project.rooms[0];
        let variables = { ...(project.variables?.global || {}), score: 0 };
        const spriteCache = new Map();
        const input = { left: 0, right: 0, up: 0, down: 0, jump: 0 };
        const camera = { x: 0, y: 0, targetX: 0, targetY: 0, zoom: 2 };

        function resize() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            ctx.imageSmoothingEnabled = false;
        }
        window.addEventListener('resize', resize);
        resize();

        async function preloadSprites() {
            document.getElementById('loading-text').innerText = 'Loading Sprites...';
            for (const sprite of project.sprites) {
                if (sprite.type === 'imported' && sprite.uri) {
                    const img = new Image();
                    img.src = sprite.uri;
                    await new Promise(r => img.onload = r);
                    spriteCache.set(sprite.id, img);
                } else if (sprite.pixels) {
                    const sCanvas = document.createElement('canvas');
                    const sCtx = sCanvas.getContext('2d');
                    const h = sprite.pixels.length;
                    const w = sprite.pixels[0].length;
                    sCanvas.width = w;
                    sCanvas.height = h;
                    sprite.pixels.forEach((row, y) => {
                        row.forEach((color, x) => {
                            if (color && color !== 'transparent') {
                                sCtx.fillStyle = color;
                                sCtx.fillRect(x, y, 1, 1);
                            }
                        });
                    });
                    const img = new Image();
                    img.src = sCanvas.toDataURL();
                    await new Promise(r => img.onload = r);
                    spriteCache.set(sprite.id, img);
                }
            }
        }

        function executeAction(action, body, obj) {
            const parts = action.split(':');
            const cmd = parts[0];
            if (cmd === 'jump') Matter.Body.setVelocity(body, { x: body.velocity.x, y: -(obj.physics?.jumpStrength || 10) * 0.4 });
            else if (cmd === 'move_left') Matter.Body.setVelocity(body, { x: -(obj.physics?.moveSpeed || 5) * 0.5, y: body.velocity.y });
            else if (cmd === 'move_right') Matter.Body.setVelocity(body, { x: (obj.physics?.moveSpeed || 5) * 0.5, y: body.velocity.y });
            else if (cmd === 'move_up') Matter.Body.setVelocity(body, { x: body.velocity.x, y: -(obj.physics?.moveSpeed || 5) * 0.5 });
            else if (cmd === 'move_down') Matter.Body.setVelocity(body, { x: body.velocity.x, y: (obj.physics?.moveSpeed || 5) * 0.5 });
            else if (cmd === 'var_add') variables[parts[1]] = (variables[parts[1]] || 0) + parseFloat(parts[2]);
        }

        function initRoom(room) {
            Composite.clear(world);
            engine.gravity.y = (room.settings?.gravity || 9.8) / 10;
            room.instances.forEach(inst => {
                const obj = project.objects.find(o => o.id === inst.objectId);
                if (!obj) return;
                const width = obj.width || 32;
                const height = obj.height || 32;
                const isStatic = obj.physics?.isStatic || !obj.physics?.enabled;
                const body = Bodies.rectangle(inst.x + width/2, inst.y + height/2, width, height, {
                    isStatic, label: inst.id, friction: 0.1, restitution: 0.1
                });
                body.gameInfo = { obj, width, height };
                Composite.add(world, body);
            });
        }

        const bindBtn = (id, prop) => {
            const el = document.getElementById(id);
            const start = (e) => { e.preventDefault(); input[prop] = 1; };
            const end = (e) => { e.preventDefault(); input[prop] = 0; };
            el.addEventListener('touchstart', start);
            el.addEventListener('touchend', end);
            el.addEventListener('mousedown', start);
            el.addEventListener('mouseup', end);
            el.addEventListener('mouseleave', end);
        };
        bindBtn('btn-left', 'left');
        bindBtn('btn-right', 'right');
        bindBtn('btn-jump', 'jump');

        window.addEventListener('keydown', e => {
            if (e.key === 'ArrowLeft' || e.key === 'a') input.left = 1;
            if (e.key === 'ArrowRight' || e.key === 'd') input.right = 1;
            if (e.key === 'ArrowUp' || e.key === 'w') { input.up = 1; input.jump = 1; }
            if (e.key === 'ArrowDown' || e.key === 's') input.down = 1;
            if (e.key === ' ' || e.key === 'x') input.jump = 1;
        });
        window.addEventListener('keyup', e => {
            if (e.key === 'ArrowLeft' || e.key === 'a') input.left = 0;
            if (e.key === 'ArrowRight' || e.key === 'd') input.right = 0;
            if (e.key === 'ArrowUp' || e.key === 'w') { input.up = 0; input.jump = 0; }
            if (e.key === 'ArrowDown' || e.key === 's') input.down = 0;
            if (e.key === ' ' || e.key === 'x') input.jump = 0;
        });

        function update() {
            Engine.update(engine, 1000 / 60);
            const bodies = Composite.allBodies(world);
            let playerBody = null;

            bodies.forEach(body => {
                const obj = body.gameInfo?.obj;
                if (!obj) return;
                const behavior = obj.behavior?.toLowerCase() || '';
                if (behavior.includes('player')) {
                    playerBody = body;
                    if (input.left) {
                        executeAction('move_left', body, obj);
                    } else if (input.right) {
                        executeAction('move_right', body, obj);
                    } else {
                        Matter.Body.setVelocity(body, { x: body.velocity.x * 0.85, y: body.velocity.y });
                    }

                    if (input.up) {
                        executeAction('move_up', body, obj);
                    } else if (input.down) {
                        executeAction('move_down', body, obj);
                    } else if (engine.gravity.y === 0) {
                        Matter.Body.setVelocity(body, { x: body.velocity.x, y: body.velocity.y * 0.85 });
                    }

                    if (input.jump && Math.abs(body.velocity.y) < 0.1) {
                        executeAction('jump', body, obj);
                    }
                }
            });

            if (playerBody) {
                camera.targetX = playerBody.position.x;
                camera.targetY = playerBody.position.y;
            }
            camera.x += (camera.targetX - camera.x) * 0.1;
            camera.y += (camera.targetY - camera.y) * 0.1;

            ctx.fillStyle = currentRoom.settings?.backgroundColor || '#111';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.save();
            ctx.translate(canvas.width/2, canvas.height/2);
            ctx.scale(camera.zoom, camera.zoom);
            ctx.translate(-camera.x, -camera.y);

            bodies.forEach(body => {
                const info = body.gameInfo;
                const img = spriteCache.get(info?.obj?.appearance?.spriteId);
                ctx.save();
                ctx.translate(body.position.x, body.position.y);
                ctx.rotate(body.angle);
                if (img) ctx.drawImage(img, -info.width/2, -info.height/2, info.width, info.height);
                else { ctx.fillStyle = 'red'; ctx.fillRect(-info.width/2, -info.height/2, info.width, info.height); }
                ctx.restore();
            });
            ctx.restore();

            uiLayer.innerHTML = Object.entries(variables).map(([k, v]) => \`<div>\${k}: \${v}</div>\`).join('');
            requestAnimationFrame(update);
        }

        (async () => {
            await preloadSprites();
            loadingScreen.style.display = 'none';
            initRoom(currentRoom);
            update();
        })().catch(err => {
            document.getElementById('loading-text').innerText = 'Engine Crash: ' + err.message;
            console.error(err);
        });
    </script>
</body>
</html>
  `;
};
