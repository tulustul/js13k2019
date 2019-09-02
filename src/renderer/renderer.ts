import { Layer } from "./layer";

import { Engine } from "../engine";
import { Vector2 } from "../vector";
import { PathCommandType } from "../level.interface";
import { assets } from "../assets";
import { Random } from "../random";

const VIEWPORT_HEIGHT = 450;

export class Renderer {
  ctx: CanvasRenderingContext2D;

  activeLayer: Layer;

  baseLayer = new Layer(this.engine, {
    canvas_: this.engine.canvas_,
  });

  skyLayer = new Layer(this.engine, {});

  terrainLayer = new Layer(this.engine, {
    renderWholeWorld: true,
    offset_: true,
    clear_: true,
  });

  hillsLayers: Layer[];

  constructor(public engine: Engine) {
    this.hillsLayers = [0.2, 0.35, 0.5].map(
      offsetScale =>
        new Layer(this.engine, {
          renderWholeWorld: true,
          offset_: true,
          offsetScale,
        }),
    );
  }

  init() {
    for (const layer of Layer.layers) {
      layer.init();
    }
    this.prerender();
  }

  renderTerrain() {
    let to: Vector2;
    this.ctx.fillStyle = "#000";
    for (const pathCommand of this.engine.level.pathCommands) {
      switch (pathCommand.type) {
        case PathCommandType.move:
          to = pathCommand.points![0];
          this.ctx.beginPath();
          this.ctx.moveTo(to.x, to.y);
          break;
        case PathCommandType.line:
          to = pathCommand.points![0];
          this.ctx.lineTo(to.x, to.y);
          break;
        case PathCommandType.bezier:
          const [c1, c2, to_] = pathCommand.points!;
          this.ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, to_.x, to_.y);
          break;
        case PathCommandType.close:
          this.ctx.closePath();
          this.ctx.fill();
          break;
      }
    }
  }

  renderPlatforms() {
    this.ctx.fillStyle = "#000";
    this.ctx.beginPath();
    for (const p of this.engine.level.platforms) {
      this.ctx.rect(p.x, p.y, p.w, p.h);
      this.ctx.fill();
      this.ctx.stroke();
    }
  }

  renderSpikes() {
    const r = new Random(1);
    this.ctx.fillStyle = "#000";

    const deadlyBodies = this.engine.physics.staticBodies.filter(
      b => b.isDeadly,
    );
    for (const body of deadlyBodies) {
      const angle = body.start_.directionTo(body.end_);
      const length = body.start_.distanceTo(body.end_);
      this.ctx.save();
      this.ctx.translate(body.start_.x, body.start_.y);
      this.ctx.rotate(angle);
      let y = 0;
      while (y < length) {
        this.ctx.beginPath();
        this.ctx.moveTo(-2, y);
        this.ctx.lineTo(-2, y + 4);
        this.ctx.lineTo(9 + 7 * r.nextFloat(), y + 2);
        this.ctx.closePath();
        this.ctx.fill();
        y += 5; // * r.nextFloat();
      }
      this.ctx.restore();
    }
  }

  renderPlayer() {
    const ctx = this.ctx;

    const player = this.engine.player;

    ctx.save();

    ctx.translate(player.body_.pos.x, player.body_.pos.y - 3);

    if (player.physics.direction_ === "r") {
      ctx.scale(-1, 1);
    }
    ctx.rotate(player.body_.vel.angle_());
    ctx.scale(1, 1 + Math.abs(player.body_.vel.y / 20));
    ctx.rotate(-player.body_.vel.angle_());

    // legs
    ctx.save();
    ctx.translate(-3, 3);
    ctx.rotate(player.animation_.lLegRot);
    ctx.drawImage(assets.limb, 0, 0, 5, 10);
    ctx.restore();

    ctx.save();
    ctx.translate(1, 3);
    ctx.rotate(player.animation_.rLegRot);
    ctx.drawImage(assets.limb, 0, 0, 5, 10);
    ctx.restore();

    ctx.drawImage(assets.torso, -20, -23, 40, 40);

    ctx.save();
    ctx.translate(0, player.animation_.headOffset);

    // arms
    ctx.save();
    ctx.translate(-3, 0);
    ctx.rotate(player.animation_.rArmRot);
    ctx.scale(0.8, 0.8);
    ctx.drawImage(assets.limb, 0, 0, 5, 10);
    ctx.restore();

    ctx.save();
    ctx.translate(3, 3);
    ctx.rotate(player.animation_.lArmRot);
    ctx.scale(0.8, 0.8);
    ctx.drawImage(assets.limb, 0, 0, 5, 10);
    ctx.restore();

    //head
    ctx.scale(0.9, 0.9);
    ctx.drawImage(assets.head_, -20, -20, 40, 40);

    // eyes
    ctx.translate(0, player.animation_.eyesOffset);
    ctx.scale(1, player.animation_.eyesScale);
    ctx.drawImage(assets.eyes, -3, -10, 10, 10);
    ctx.restore();

    ctx.restore();
  }

  renderSky() {
    const canvas = this.engine.renderer.activeLayer.canvas_;
    var grd = this.ctx.createLinearGradient(0, 0, 0, canvas.height);
    grd.addColorStop(0, "#555");
    grd.addColorStop(1, "#111");
    this.ctx.fillStyle = grd;
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);

    const gradient = this.ctx.createRadialGradient(
      100,
      100,
      10,
      100,
      100,
      300,
    );
    gradient.addColorStop(0, "#ddd");
    gradient.addColorStop(0.03, "#ddd");
    gradient.addColorStop(0.04, "#777");
    gradient.addColorStop(1, "transparent");
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  renderHills(
    color: string,
    size: number,
    amplitude: number,
    spread: number,
    seed: number,
  ) {
    const r = new Random(seed);
    const canvas = this.engine.renderer.activeLayer.canvas_;
    const blur = 2 / this.engine.renderer.activeLayer.offsetScale;

    var grd = this.ctx.createLinearGradient(0, 0, 0, canvas.height);
    grd.addColorStop(0, color);
    grd.addColorStop(1, "#111");
    this.ctx.filter = `blur(${blur}px)`;

    this.ctx.fillStyle = grd;
    this.ctx.lineWidth = 0;
    let x = 0;
    while (x < canvas.width) {
      this.ctx.beginPath();
      this.ctx.save();
      this.ctx.translate(x, canvas.height);
      this.ctx.scale(1, amplitude + r.nextVariation() * amplitude * 0.5);
      this.ctx.arc(0, 0, size, Math.PI, Math.PI * 2);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.restore();
      x += spread + r.nextVariation() * spread * 0.5;
    }
  }

  renderFoliage(isForeGround: boolean) {
    const minX = this.engine.camera.pos.x - 100;
    const maxX = this.engine.camera.pos.x + this.engine.canvas_.width + 100;

    for (let x = minX; x < maxX; x += this.engine.foliage.GRID_SIZE) {
      const cell = Math.floor(x / this.engine.foliage.GRID_SIZE);
      for (const foliage of this.engine.foliage.entities_[cell] || []) {
        if (foliage.isForeground !== isForeGround) {
          continue;
        }

        const framesCount = foliage.definition.frames.length;
        let frame = Math.abs(
          (Math.round(this.engine.time_ / 50 + foliage.pos.x) %
            (framesCount * 2)) -
            framesCount,
        );
        if (frame === framesCount) {
          frame = framesCount - 1;
        }
        const image = foliage.definition.frames[frame];
        this.ctx.drawImage(
          image,
          foliage.pos.x - image.width / 2,
          foliage.pos.y - image.height + 5,
        );
      }
    }
  }

  renderLights() {
    const player = this.engine.player;

    this.ctx.save();
    this.ctx.translate(player.body_.pos.x, player.body_.pos.y - 1);

    const size = 50 + Math.sin(this.engine.time_ / 300) * 5;

    var grd = this.ctx.createRadialGradient(0, 0, 10, 0, 0, size);
    grd.addColorStop(0, "#333");
    grd.addColorStop(1, "transparent");
    this.ctx.fillStyle = grd;
    this.ctx.fillRect(-size, -size, size * 2, size * 2);

    this.ctx.restore();
  }

  prerender() {
    this.skyLayer.activate();
    this.renderSky();

    this.terrainLayer.activate();
    this.renderSpikes();
    this.renderPlatforms();
    this.renderTerrain();

    const hillsParams: [string, number, number, number, number][] = [
      ["#282828", 500, 0.5, 1300, 3],
      ["#222", 400, 0.7, 1000, 7],
      ["#1d1d1d", 200, 1.0, 800, 9],
    ];
    for (const [index, hillsLayer] of this.hillsLayers.entries()) {
      hillsLayer.activate();
      this.renderHills(...hillsParams[index]);
    }
  }

  renderParticles() {
    this.ctx.strokeStyle = "#fff";
    this.ctx.lineWidth = 1;
    for (const particle of this.engine.particles.particles) {
      const pos = particle.pos;
      const vel = particle.vel;

      this.ctx.beginPath();
      this.ctx.moveTo(pos.x, pos.y);
      this.ctx.lineTo(pos.x + vel.x, pos.y + vel.y);
      this.ctx.stroke();
    }
  }

  render() {
    const pos = this.engine.camera.pos;

    this.baseLayer.activate();
    this.drawLayer(this.skyLayer);
    for (const hillsLayer of this.hillsLayers) {
      this.drawLayer(hillsLayer);
    }

    this.ctx.translate(-pos.x, -pos.y);
    this.renderFoliage(false);
    this.ctx.translate(pos.x, pos.y);

    this.drawLayer(this.terrainLayer);

    this.ctx.translate(-pos.x, -pos.y);

    if (!this.engine.player.isDead) {
      this.renderPlayer();
    }

    this.renderParticles();
    this.renderFoliage(true);

    if (!this.engine.player.isDead) {
      this.ctx.globalCompositeOperation = "screen";
      this.renderLights();
      this.ctx.globalCompositeOperation = "source-over";
    }

    this.ctx.translate(pos.x, pos.y);
  }

  updateSize() {
    const width = (window.innerWidth / window.innerHeight) * VIEWPORT_HEIGHT;

    this.engine.canvas_.width = Math.floor(width);
    this.engine.canvas_.height = VIEWPORT_HEIGHT;

    for (const layer of Layer.layers) {
      layer.updateSize();
    }
    this.prerender();
  }

  drawLayer(layer: Layer) {
    if (layer.offset_) {
      this.drawLayerWithCameraOffset(layer);
    } else {
      this.ctx.drawImage(layer.canvas_, 0, 0);
    }
  }

  drawLayerWithCameraOffset(layer: Layer) {
    this.ctx.drawImage(
      layer.canvas_,
      this.engine.camera.pos.x * layer.offsetScale,
      this.engine.camera.pos.y * (layer.offsetScale === 1 ? 1 : 0),
      this.activeLayer.canvas_.width,
      this.activeLayer.canvas_.height,
      0,
      0,
      this.activeLayer.canvas_.width,
      this.activeLayer.canvas_.height,
    );
  }
}
