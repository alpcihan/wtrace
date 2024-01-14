import { Scene } from "./scene";

class SceneManager {
    public static loadScene(scene: Scene): void {
        this.m_scene = scene;
    }

    public static get scene(): Scene {
        return this.m_scene;
    }

    public static isSceneAssigned(): boolean {
        return this.m_scene !== undefined;
    }

    private static m_scene: Scene;
}

export { SceneManager };
