import { WTTexture } from "../wtrace";

class TextureLoader {

    public static async load(path: string): Promise< WTTexture | undefined > {
        let texture = new WTTexture();

        const response: Response = await fetch(path);
        
        // Check if the request was successful
        if (!response.ok) {
            console.error(`HTTP error! status: ${response.status}`);
            return undefined;
        }

        const blob = await response.blob();
        const imageData: ImageBitmap = await createImageBitmap(blob); 

        texture.data = imageData;
        
        return texture;
    }
}

export { TextureLoader };