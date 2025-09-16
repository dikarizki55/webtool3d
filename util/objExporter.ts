import * as THREE from "three";

interface MaterialWithId extends THREE.Material {
  id: number;
}

export class OBJExporterWithMTL {
  private objOutput = "";
  private materials: Record<string, THREE.Material> = {};

  parse(object: THREE.Object3D) {
    this.objOutput = "";
    this.materials = {};

    this.objOutput += "mtllib model.mtl\n";

    let vertexOffset = 0;

    object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      const mesh = child as THREE.Mesh;
      const geometry = mesh.geometry as THREE.BufferGeometry;
      const material = Array.isArray(mesh.material)
        ? mesh.material[0]
        : (mesh.material as THREE.Material);

      const mat = material as MaterialWithId;
      const matName = mat.name || `material_${mat.id}`;
      this.materials[matName] = mat;

      // object name
      this.objOutput += `o ${mesh.name || "mesh_" + mesh.id}\n`;

      // gunakan material
      this.objOutput += `usemtl ${matName}\n`;

      // vertices
      const position = geometry.getAttribute("position");
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const y = position.getY(i);
        const z = position.getZ(i);
        this.objOutput += `v ${x} ${y} ${z}\n`;
      }

      // faces (as triangles)
      const index = geometry.index;
      if (index) {
        for (let i = 0; i < index.count; i += 3) {
          const a = index.getX(i) + 1 + vertexOffset;
          const b = index.getX(i + 1) + 1 + vertexOffset;
          const c = index.getX(i + 2) + 1 + vertexOffset;
          this.objOutput += `f ${a} ${b} ${c}\n`;
        }
      } else {
        for (let i = 0; i < position.count; i += 3) {
          const a = vertexOffset + i + 1;
          const b = vertexOffset + i + 2;
          const c = vertexOffset + i + 3;
          this.objOutput += `f ${a} ${b} ${c}\n`;
        }
      }

      vertexOffset += position.count;
    });

    return {
      obj: this.objOutput,
      mtl: this.buildMTL(),
    };
  }

  private buildMTL() {
    let mtlOutput = "";

    for (const [name, mat] of Object.entries(this.materials)) {
      const color =
        mat instanceof THREE.MeshStandardMaterial ||
        mat instanceof THREE.MeshPhongMaterial
          ? mat.color
          : new THREE.Color(1, 1, 1);

      mtlOutput += `newmtl ${name}\n`;
      mtlOutput += `Kd ${color.r} ${color.g} ${color.b}\n`;
      mtlOutput += "Ka 0 0 0\n";
      mtlOutput += "Ks 0 0 0\n";
      mtlOutput += "d 1.0\n\n";
    }

    return mtlOutput;
  }
}
