import { Scene } from "./scene";

// TODO: support multiple listeners/subscribers
let onSceneLoadCallback: Function;
export const setOnSceneLoadCallback = (callback: Function): void => { onSceneLoadCallback = callback };

class SceneManager {
    public static loadScene(scene: Scene): void {
        // clear the previous scene
        if (this.m_scene) {
            this.m_scene.sceneDataManager.clear();
        }

        // load the new scene
        this.m_scene = scene;
        this.m_scene.sceneDataManager.buildSceneData();
        onSceneLoadCallback();
    }

    public static get scene(): Scene {
        return this.m_scene;
    }

    private static m_scene: Scene;
}

export { SceneManager };
