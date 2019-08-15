import { EntitySystem, EntityEngine, Entity } from "./ecs";
import { Vector2 } from "../vector";
import { BARRIER_MASK } from "../colisions-masks";
import { DynamicPhysicalEntity } from "./physics/physics.interface";
import { PhysicsSystem } from "./physics/physics";
import { CircleShape } from "./physics/shapes";

export interface AgentOptions {
  maxHealth?: number;
  colisionMask: number;
}

export class AgentComponent extends Entity {
  maxSpeed = 8;

  weight = 1;

  ACCELERATION = 1.5;

  physicalEntity: DynamicPhysicalEntity;

  rot = 0;

  onHit: () => void;

  constructor(
    public engine: EntityEngine,
    pos: Vector2,
    options: AgentOptions,
  ) {
    super();
    if (options) {
      Object.assign(this, options);
    }

    this.engine.getSystem(AgentSystem).add(this);

    const physics = this.engine.getSystem<PhysicsSystem>(PhysicsSystem);

    this.physicalEntity = physics.addDynamic({
      shape: new CircleShape(pos, 10),
      parent: this,
      receiveMask: options.colisionMask,
      hitMask: BARRIER_MASK,
      bounciness: 0.5,
      pos: pos,
      friction: 1.03,
      vel: new Vector2(0, 0),
      weight: 1,
    });
  }

  destroy() {
    this.engine
      .getSystem<PhysicsSystem>(PhysicsSystem)
      .remove(this.physicalEntity);
    super.destroy();
  }

  moveToDirection(direction: number) {
    const acc = new Vector2(0, this.ACCELERATION).rotate(direction);
    this.updateVelocity(acc);
  }

  private updateVelocity(acc: Vector2) {
    const speed = this.maxSpeed / this.weight;
    this.physicalEntity.vel.x = Math.min(
      speed,
      Math.max(-speed, this.physicalEntity.vel.x + acc.x),
    );
    this.physicalEntity.vel.y = Math.min(
      speed,
      Math.max(-speed, this.physicalEntity.vel.y + acc.y),
    );
  }
}

export class AgentSystem extends EntitySystem<AgentComponent> {
  update() {}
}
