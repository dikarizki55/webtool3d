import * as THREE from "three";

export class MTLExporter {
  parse(object: THREE.Object3D): string {
    let output = "";
    const materials: Record<string, boolean> = {};

    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        let mat = child.material as THREE.Material | THREE.Material[];

        if (Array.isArray(mat)) {
          mat.forEach((m, idx) => {
            output += this.buildMaterial(
              m,
              `${child.name}_mat${idx}`,
              materials
            );
          });
        } else if (mat) {
          output += this.buildMaterial(mat, `${child.name}_mat`, materials);
        }
      }
    });

    return output;
  }

  private buildMaterial(
    material: THREE.Material,
    defaultName: string,
    registry: Record<string, boolean>
  ): string {
    if (registry[defaultName]) return ""; // avoid duplicate
    registry[defaultName] = true;

    let lines: string[] = [];
    lines.push(`newmtl ${defaultName}`);

    if ((material as any).color) {
      const c = (material as any).color as THREE.Color;
      lines.push(`Kd ${c.r.toFixed(6)} ${c.g.toFixed(6)} ${c.b.toFixed(6)}`);
    } else {
      lines.push(`Kd 1 1 1`);
    }

    // basic defaults
    lines.push("Ka 0 0 0"); // ambient
    lines.push("Ks 0 0 0"); // specular
    lines.push("Ns 10"); // shininess
    lines.push("illum 2");

    lines.push("");
    return lines.join("\n") + "\n";
  }
}
